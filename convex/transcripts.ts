import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireWorkspaceMembership } from "./lib/authz";
import { behaviorTagValidator } from "./lib/contracts";
import { paginationOptsValidator } from "convex/server";

const transcriptChunkViewValidator = v.object({
  _id: v.id("transcriptChunks"),
  _creationTime: v.number(),
  sessionId: v.id("sessions"),
  sourceEventId: v.optional(v.string()),
  sequence: v.number(),
  role: v.union(
    v.literal("user"),
    v.literal("assistant"),
    v.literal("manager"),
    v.literal("system"),
  ),
  speakerId: v.string(),
  text: v.string(),
  behaviorTag: v.optional(behaviorTagValidator),
  timestamp: v.number(),
});

export const listPaginated = query({
  args: {
    sessionId: v.id("sessions"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(transcriptChunkViewValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const result = await ctx.db
      .query("transcriptChunks")
      .withIndex("by_session_and_sequence", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      page: result.page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const appendFromWebhook = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    sourceEventId: v.optional(v.string()),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("manager"),
      v.literal("system"),
    ),
    speakerId: v.string(),
    text: v.string(),
    behaviorTag: v.optional(behaviorTagValidator),
    timestamp: v.optional(v.number()),
  },
  returns: v.id("transcriptChunks"),
  handler: async (ctx, args) => {
    if (args.sourceEventId) {
      const duplicate = await ctx.db
        .query("transcriptChunks")
        .withIndex("by_source_event_id", (q) => q.eq("sourceEventId", args.sourceEventId))
        .first();
      if (duplicate) {
        return duplicate._id;
      }
    }

    const latest = await ctx.db
      .query("transcriptChunks")
      .withIndex("by_session_and_sequence", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(1);

    const nextSequence = latest[0] ? latest[0].sequence + 1 : 1;

    return await ctx.db.insert("transcriptChunks", {
      sessionId: args.sessionId,
      sourceEventId: args.sourceEventId,
      sequence: nextSequence,
      role: args.role,
      speakerId: args.speakerId,
      text: args.text,
      behaviorTag: args.behaviorTag,
      timestamp: args.timestamp ?? Date.now(),
    });
  },
});

export const getRecent = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    limit: v.number(),
  },
  returns: v.array(transcriptChunkViewValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transcriptChunks")
      .withIndex("by_session_and_sequence", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(args.limit);
  },
});

export const getSessionText = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    limit: v.number(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("transcriptChunks")
      .withIndex("by_session_and_sequence", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(args.limit);

    return chunks.map((chunk) => chunk.text);
  },
});
