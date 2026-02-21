"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildWorkerPrompt } from "./lib/managerTemplates";

const internalApi = internal as any;
const env = (globalThis as any).process?.env ?? {};

// ---------------------------------------------------------------------------
// Dispatch Action — POSTs to Vapi /call API to start a parallel worker call.
// Lives in its own "use node" module so queries/mutations in workerCalls.ts
// run in the default Convex runtime.
// ---------------------------------------------------------------------------

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

    // Gather dependency status for the worker prompt
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

    // Get session goal
    const session = (await ctx.runQuery(
      internalApi.sessions.getByIdInternal,
      { sessionId: args.sessionId },
    )) as { goalText: string } | null;

    // Get constitution rules
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

    try {
      const response = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${vapiApiKey}`,
        },
        body: JSON.stringify({
          phoneNumberId: env.VAPI_PHONE_NUMBER_ID,
          customer: { number: args.phoneNumber },
          assistantOverrides: {
            model: {
              provider: "anthropic",
              model:
                (env.MORPHICFIELDS_WORKER_MODEL as string | undefined) ??
                "claude-3-5-haiku-latest",
              systemPrompt: workerPrompt,
            },
            firstMessage: `Hi ${args.participantName}, I am your task assistant for "${args.taskLabel}". Let me walk you through what we need.`,
            variableValues: {
              sessionId: args.sessionId,
              taskKey: args.taskKey,
              participantUserId: args.participantUserId,
              workerCallId: args.workerCallId,
              role: "worker",
            },
          },
          metadata: {
            sessionId: args.sessionId,
            taskKey: args.taskKey,
            workerCallId: args.workerCallId,
            role: "worker",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await ctx.runMutation(internalApi.workerCalls.updateStatus, {
          workerCallId: args.workerCallId,
          status: "failed",
          summary: `Vapi API ${response.status}: ${errorText.slice(0, 200)}`,
        });
        return;
      }

      const result = (await response.json()) as { id?: string };
      if (result.id) {
        await ctx.runMutation(internalApi.workerCalls.bindVapiCallId, {
          workerCallId: args.workerCallId,
          vapiCallId: result.id,
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
