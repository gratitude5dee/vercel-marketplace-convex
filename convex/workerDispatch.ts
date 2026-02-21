"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildWorkerPrompt } from "./lib/managerTemplates";

const internalApi = internal as any;
const env = (globalThis as any).process?.env ?? {};

// ---------------------------------------------------------------------------
// Two-step Vapi integration:
// 1. POST /assistant  — create a transient worker assistant with scoped prompt
// 2. POST /call       — start the outbound call using that assistant
// ---------------------------------------------------------------------------

async function vapiPost(path: string, body: Record<string, unknown>) {
  const apiKey = env.VAPI_API_KEY as string;
  const res = await fetch(`https://api.vapi.ai${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Vapi ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

export const dispatchCall = internalAction({
  args: {
    sessionId: v.id("sessions"),
    workerCallId: v.id("workerCalls"),
    taskKey: v.string(),
    taskLabel: v.string(),
    taskDescription: v.string(),
    participantUserId: v.string(),
    participantName: v.string(),
    participantStyle: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analytical"),
      v.literal("facilitative"),
    ),
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const vapiApiKey = env.VAPI_API_KEY as string | undefined;
    if (!vapiApiKey) {
      await ctx.runMutation(internalApi.workerCalls.updateStatus, {
        workerCallId: args.workerCallId,
        status: "failed",
        summary: "VAPI_API_KEY not configured.",
      });
      return;
    }

    const phoneNumberId = env.VAPI_PHONE_NUMBER_ID as string | undefined;
    if (!phoneNumberId) {
      await ctx.runMutation(internalApi.workerCalls.updateStatus, {
        workerCallId: args.workerCallId,
        status: "failed",
        summary: "VAPI_PHONE_NUMBER_ID not configured.",
      });
      return;
    }

    // ---- Gather context for the worker prompt ----

    const graph = (await ctx.runQuery(internalApi.tasks.listGraphInternal, {
      sessionId: args.sessionId,
    })) as {
      tasks: Array<{ taskKey: string; label: string; status: string }>;
      dependencies: Array<{ fromTaskKey: string; toTaskKey: string }>;
    };

    const upstreamKeys = graph.dependencies
      .filter((d) => d.toTaskKey === args.taskKey)
      .map((d) => d.fromTaskKey);
    const dependencyStatus = graph.tasks.filter((t) =>
      upstreamKeys.includes(t.taskKey),
    );

    const session = (await ctx.runQuery(
      internalApi.sessions.getByIdInternal,
      { sessionId: args.sessionId },
    )) as { goalText: string } | null;

    const constitution = (await ctx.runQuery(
      internalApi.constitutions.getLatestInternal,
      { sessionId: args.sessionId },
    )) as { rules: Array<{ text: string }> } | null;

    const workerPrompt = buildWorkerPrompt({
      taskKey: args.taskKey,
      taskLabel: args.taskLabel,
      taskDescription: args.taskDescription,
      participantName: args.participantName,
      participantStyle: args.participantStyle,
      dependencyStatus,
      constitutionRules: constitution?.rules.map((r) => r.text) ?? [],
      sessionGoal: session?.goalText ?? "Unknown goal",
    });

    // ---- Derive the Convex HTTP Actions URL for the serverUrl ----
    // NEXT_PUBLIC_CONVEX_URL may be .convex.cloud; serverUrl needs .convex.site
    const convexUrl = (env.NEXT_PUBLIC_CONVEX_URL ?? "") as string;
    const serverUrl = convexUrl
      .replace(/\.convex\.cloud\/?$/, ".convex.site")
      .replace(/\/?$/, "/vapi/events");

    try {
      // Step 1: Create a transient Vapi Assistant with the scoped worker prompt
      const assistant = await vapiPost("/assistant", {
        name: `MF Worker: ${args.taskLabel} (${args.participantName})`,
        model: {
          provider: "anthropic",
          model:
            (env.MORPHICFIELDS_WORKER_MODEL as string | undefined) ??
            "claude-3-5-haiku-latest",
          messages: [
            {
              role: "system",
              content: workerPrompt,
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: (env.VAPI_WORKER_VOICE_ID as string | undefined) ?? "rachel",
        },
        firstMessage: `Hi ${args.participantName}, I am your task assistant for "${args.taskLabel}". Let me walk you through what we need.`,
        serverUrl,
        metadata: {
          sessionId: args.sessionId,
          taskKey: args.taskKey,
          workerCallId: args.workerCallId,
          participantUserId: args.participantUserId,
          role: "worker",
        },
      });

      const assistantId = assistant.id as string;
      if (!assistantId) {
        throw new Error(
          `Vapi /assistant returned no id: ${JSON.stringify(assistant).slice(0, 200)}`,
        );
      }

      // Step 2: Create the outbound call using the new assistant
      const call = await vapiPost("/call", {
        assistantId,
        phoneNumberId,
        customer: {
          number: args.phoneNumber,
        },
        metadata: {
          sessionId: args.sessionId,
          taskKey: args.taskKey,
          workerCallId: args.workerCallId,
          participantUserId: args.participantUserId,
          role: "worker",
        },
      });

      const vapiCallId = call.id as string | undefined;

      if (vapiCallId) {
        await ctx.runMutation(internalApi.workerCalls.bindVapiCallId, {
          workerCallId: args.workerCallId,
          vapiCallId,
        });
      }
    } catch (error) {
      await ctx.runMutation(internalApi.workerCalls.updateStatus, {
        workerCallId: args.workerCallId,
        status: "failed",
        summary: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
