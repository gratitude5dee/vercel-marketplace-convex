import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();
const internalApi = internal as any;

http.route({
  path: "/vapi/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const providedSecret =
      request.headers.get("x-vapi-secret") ??
      request.headers.get("x-api-key") ??
      request.headers.get("authorization")?.replace("Bearer ", "");

    const isAuthorized = await ctx.runAction(internalApi.webhooks.verifyVapiAuth, {
      providedSecret,
    });

    if (!isAuthorized) {
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const result = await ctx.runAction(internalApi.webhooks.processVapiEvent, {
      payload,
    });

    if (result.eventType === "assistant-request" && result.assistant) {
      return new Response(JSON.stringify({ assistant: result.assistant }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: result.status === "failed" ? 500 : 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", service: "morphicfields" }), {
      headers: { "content-type": "application/json" },
    });
  }),
});

export default http;
