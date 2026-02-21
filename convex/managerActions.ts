import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  query,
} from "./_generated/server";
import {
  invocationTriggerValidator,
  managerActionTypeValidator,
} from "./lib/contracts";
import { requireWorkspaceMembership } from "./lib/authz";

const managerActionViewValidator = v.object({
  _id: v.id("managerActions"),
  _creationTime: v.number(),
  sessionId: v.id("sessions"),
  actionType: managerActionTypeValidator,
  trigger: invocationTriggerValidator,
  taskKey: v.optional(v.string()),
  assigneeUserId: v.optional(v.string()),
  message: v.optional(v.string()),
  meta: v.optional(v.any()),
  createdAt: v.number(),
});

export const listRecent = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  returns: v.array(managerActionViewValidator),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    return await ctx.db
      .query("managerActions")
      .withIndex("by_session_and_time", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const log = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    actionType: managerActionTypeValidator,
    trigger: invocationTriggerValidator,
    taskKey: v.optional(v.string()),
    assigneeUserId: v.optional(v.string()),
    message: v.optional(v.string()),
    meta: v.optional(v.any()),
  },
  returns: v.id("managerActions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("managerActions", {
      sessionId: args.sessionId,
      actionType: args.actionType,
      trigger: args.trigger,
      taskKey: args.taskKey,
      assigneeUserId: args.assigneeUserId,
      message: args.message,
      meta: args.meta,
      createdAt: Date.now(),
    });
  },
});
