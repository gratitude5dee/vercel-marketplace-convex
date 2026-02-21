import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { workerCallStatusValidator } from "./lib/contracts";
import { requireIdentity } from "./lib/authz";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db
      .query("workerCalls")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

export const listActiveBySession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workerCalls")
      .withIndex("by_session_and_status", (q) =>
        q.eq("sessionId", args.sessionId).eq("status", "active"),
      )
      .collect();
  },
});

export const getByVapiCallId = internalQuery({
  args: { callId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workerCalls")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.callId))
      .unique();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const create = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    participantUserId: v.string(),
    participantName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workerCalls", {
      sessionId: args.sessionId,
      taskKey: args.taskKey,
      participantUserId: args.participantUserId,
      participantName: args.participantName,
      phoneNumber: args.phoneNumber,
      status: "pending",
      startedAt: Date.now(),
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    workerCallId: v.id("workerCalls"),
    status: workerCallStatusValidator,
    vapiCallId: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.vapiCallId) patch.vapiCallId = args.vapiCallId;
    if (args.summary) patch.summary = args.summary;
    if (args.status === "completed" || args.status === "failed") {
      patch.endedAt = Date.now();
    }
    await ctx.db.patch(args.workerCallId, patch);
  },
});

export const bindVapiCallId = internalMutation({
  args: {
    workerCallId: v.id("workerCalls"),
    vapiCallId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workerCallId, {
      vapiCallId: args.vapiCallId,
      status: "ringing",
    });
  },
});
