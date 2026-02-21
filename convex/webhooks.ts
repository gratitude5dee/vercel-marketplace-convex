import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

const internalApi = internal as any;
const env = (globalThis as any).process?.env ?? {};

function extractEventId(payload: any) {
  return (
    payload?.eventId ??
    payload?.message?.id ??
    `${payload?.message?.type ?? "unknown"}:${payload?.message?.call?.id ?? "no-call"}:${payload?.timestamp ?? Date.now()}`
  );
}

function buildPayloadPreview(payload: any) {
  try {
    const serialized = JSON.stringify(payload);
    return serialized.length > 2000 ? `${serialized.slice(0, 2000)}...` : serialized;
  } catch {
    return " ";
  }
}

export const getEventByProviderAndId = internalQuery({
  args: {
    provider: v.string(),
    eventId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("webhookEvents"),
      status: v.union(
        v.literal("received"),
        v.literal("processed"),
        v.literal("ignored"),
        v.literal("failed"),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("webhookEvents")
      .withIndex("by_provider_and_eventId", (q) =>
        q.eq("provider", args.provider).eq("eventId", args.eventId),
      )
      .unique();

    if (!event) {
      return null;
    }

    return {
      _id: event._id,
      status: event.status,
    };
  },
});

export const recordEvent = internalMutation({
  args: {
    provider: v.string(),
    eventId: v.string(),
    type: v.string(),
    payloadPreview: v.optional(v.string()),
  },
  returns: v.id("webhookEvents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", {
      provider: args.provider,
      eventId: args.eventId,
      type: args.type,
      status: "received",
      receivedAt: Date.now(),
      payloadPreview: args.payloadPreview,
    });
  },
});

export const markEvent = internalMutation({
  args: {
    eventDocId: v.id("webhookEvents"),
    status: v.union(
      v.literal("processed"),
      v.literal("ignored"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventDocId, {
      status: args.status,
      processedAt: Date.now(),
      error: args.error,
    });
    return null;
  },
});

export const processVapiEvent = internalAction({
  args: {
    payload: v.any(),
  },
  returns: v.object({
    status: v.string(),
    eventType: v.string(),
    assistant: v.optional(v.any()),
    managerMessage: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const payload = args.payload;
    const messageType = payload?.message?.type ?? "unknown";
    const eventId = extractEventId(payload);

    const duplicate = await ctx.runQuery(internalApi.webhooks.getEventByProviderAndId, {
      provider: "vapi",
      eventId,
    });

    if (duplicate) {
      return {
        status: "duplicate",
        eventType: messageType,
      };
    }

    const eventDocId = await ctx.runMutation(internalApi.webhooks.recordEvent, {
      provider: "vapi",
      eventId,
      type: messageType,
      payloadPreview: buildPayloadPreview(payload),
    });

    try {
      if (messageType === "assistant-request") {
        await ctx.runMutation(internalApi.webhooks.markEvent, {
          eventDocId,
          status: "processed",
        });

        return {
          status: "processed",
          eventType: messageType,
          assistant: {
            model: {
              provider: "anthropic",
              model:
                (env.MORPHICFIELDS_MANAGER_MODEL as string | undefined) ??
                "claude-3-5-haiku-latest",
            },
            firstMessage:
              "Welcome to MorphicFields. I will coordinate the session and ask targeted questions when human input is required.",
          },
        };
      }

      const callId = payload?.message?.call?.id;
      const metadata = payload?.message?.metadata ?? payload?.metadata ?? {};
      const metadataSessionId = payload?.sessionId ?? metadata?.sessionId;
      const isWorkerCall = metadata?.role === "worker";
      const workerCallId = metadata?.workerCallId;
      let resolvedSessionId: string | null = metadataSessionId ?? null;

      if (!resolvedSessionId && callId) {
        resolvedSessionId = await ctx.runQuery(internalApi.sessions.getByCallId, { callId });
      }

      // --- Worker call routing ---
      if (isWorkerCall && workerCallId) {
        if (messageType === "status-update") {
          const vapiStatus = payload?.message?.status ?? "";
          const statusMap: Record<string, string> = {
            ringing: "ringing",
            "in-progress": "active",
            ended: "completed",
            failed: "failed",
            "no-answer": "failed",
            busy: "failed",
          };
          const mappedStatus = statusMap[vapiStatus] ?? null;
          if (mappedStatus) {
            await ctx.runMutation(internalApi.workerCalls.updateStatus, {
              workerCallId,
              status: mappedStatus,
              vapiCallId: callId,
            });
          }
        }

        if (
          messageType === "transcript" &&
          payload?.message?.transcriptType === "final" &&
          payload?.message?.transcript?.text &&
          resolvedSessionId
        ) {
          await ctx.runMutation(internalApi.transcripts.appendFromWebhook, {
            sessionId: resolvedSessionId,
            sourceEventId: eventId,
            role: "user",
            speakerId: metadata.participantUserId ?? "worker-participant",
            text: payload.message.transcript.text,
            behaviorTag: "elicit",
          });
        }

        if (messageType === "end-of-call-report") {
          await ctx.runMutation(internalApi.workerCalls.updateStatus, {
            workerCallId,
            status: "completed",
            summary: payload?.message?.summary ?? "Call ended.",
          });

          // Mark task as completed if the worker reported completion
          if (resolvedSessionId && metadata.taskKey) {
            const summary = (payload?.message?.summary ?? "").toLowerCase();
            if (summary.includes("complete") || summary.includes("done")) {
              await ctx.runMutation(internalApi.tasks.updateTaskStatusInternal, {
                sessionId: resolvedSessionId,
                taskKey: metadata.taskKey,
                status: "completed",
              });
            }
          }
        }

        await ctx.runMutation(internalApi.webhooks.markEvent, {
          eventDocId,
          status: "processed",
        });

        return {
          status: "processed",
          eventType: `worker:${messageType}`,
        };
      }

      // --- Manager call routing (existing) ---
      if (messageType === "status-update" && callId && resolvedSessionId) {
        await ctx.runMutation(internalApi.sessions.bindVapiCall, {
          sessionId: resolvedSessionId,
          callId,
        });
      }

      if (
        messageType === "transcript" &&
        payload?.message?.transcriptType === "final" &&
        payload?.message?.transcript?.text &&
        resolvedSessionId
      ) {
        const transcriptRole = ["user", "assistant", "manager", "system"].includes(
          payload?.message?.transcript?.role ?? "",
        )
          ? payload.message.transcript.role
          : "user";

        const transcriptChunkId = await ctx.runMutation(
          internalApi.transcripts.appendFromWebhook,
          {
            sessionId: resolvedSessionId,
            sourceEventId: eventId,
            role: transcriptRole,
            speakerId: payload?.message?.transcript?.speaker ?? "user",
            text: payload.message.transcript.text,
            timestamp: payload?.timestamp,
          },
        );

        const managerResult = await ctx.runAction(
          internalApi.manager.processFinalTranscript,
          {
            sessionId: resolvedSessionId,
            sourceEventId: eventId,
            speakerId: payload?.message?.transcript?.speaker ?? "user",
            text: payload.message.transcript.text,
            transcriptChunkId,
          },
        );

        await ctx.runMutation(internalApi.metrics.recompute, {
          sessionId: resolvedSessionId,
        });

        await ctx.runMutation(internalApi.webhooks.markEvent, {
          eventDocId,
          status: "processed",
        });

        return {
          status: "processed",
          eventType: messageType,
          managerMessage: managerResult.message,
        };
      }

      if (messageType === "end-of-call-report" && resolvedSessionId && callId) {
        const transcriptTexts = await ctx.runQuery(internalApi.transcripts.getSessionText, {
          sessionId: resolvedSessionId,
          limit: 200,
        });

        await ctx.runAction(internalApi.media.persistRecording, {
          sessionId: resolvedSessionId,
          callId,
          recordingUrl: payload?.message?.recordingUrl,
          durationMs: payload?.message?.durationMs,
          transcriptSnapshotText: transcriptTexts.join("\n"),
        });

        await ctx.runMutation(internalApi.sessions.markCompleteInternal, {
          sessionId: resolvedSessionId,
        });
      }

      await ctx.runMutation(internalApi.webhooks.markEvent, {
        eventDocId,
        status: resolvedSessionId ? "processed" : "ignored",
      });

      return {
        status: resolvedSessionId ? "processed" : "ignored",
        eventType: messageType,
      };
    } catch (error) {
      await ctx.runMutation(internalApi.webhooks.markEvent, {
        eventDocId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: "failed",
        eventType: messageType,
      };
    }
  },
});

export const verifyVapiAuth = internalAction({
  args: {
    providedSecret: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (_ctx, args) => {
    const expectedSecret = env.VAPI_WEBHOOK_SECRET as string | undefined;
    if (!expectedSecret) {
      return true;
    }

    return args.providedSecret === expectedSecret;
  },
});
