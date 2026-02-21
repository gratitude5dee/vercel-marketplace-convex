import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const internalApi = internal as any;

export const cleanupStaleSessions = internalMutation({
  args: {
    staleAfterMs: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const threshold = Date.now() - (args.staleAfterMs ?? 1000 * 60 * 60 * 24);
    const sessions = await ctx.db.query("sessions").collect();
    const stale = sessions.filter(
      (session) => session.status === "active" && session.startedAt < threshold,
    );

    await Promise.all(
      stale.map((session) =>
        ctx.db.patch(session._id, {
          status: "failed",
          endedAt: Date.now(),
        }),
      ),
    );

    return stale.length;
  },
});

export const recoverStuckTasks = internalMutation({
  args: {
    staleAfterMs: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const threshold = Date.now() - (args.staleAfterMs ?? 1000 * 60 * 60 * 2);
    const tasks = await ctx.db.query("tasks").collect();

    const stuck = tasks.filter(
      (task) => task.status === "in_progress" && task.updatedAt < threshold,
    );

    await Promise.all(
      stuck.map((task) =>
        ctx.db.patch(task._id, {
          status: "ready",
          updatedAt: Date.now(),
        }),
      ),
    );

    return stuck.length;
  },
});

export const rollupDailyMetrics = internalAction({
  args: {
    dateKey: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const dateKey =
      args.dateKey ??
      new Date().toISOString().slice(0, 10);

    return await ctx.runMutation(internalApi.metrics.rollupForDate, {
      dateKey,
    });
  },
});

export const cleanupOrphanMedia = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const mediaAssets = await ctx.db.query("mediaAssets").collect();
    let deleted = 0;

    for (const media of mediaAssets) {
      const session = await ctx.db.get(media.sessionId);
      if (!session) {
        await ctx.storage.delete(media.storageId);
        if (media.transcriptSnapshotStorageId) {
          await ctx.storage.delete(media.transcriptSnapshotStorageId);
        }
        await ctx.db.delete(media._id);
        deleted += 1;
      }
    }

    return deleted;
  },
});

export const reconcileWebhookRetries = internalMutation({
  args: {
    retryAfterMs: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const threshold = Date.now() - (args.retryAfterMs ?? 1000 * 60 * 30);
    const pendingEvents = await ctx.db
      .query("webhookEvents")
      .withIndex("by_status", (q) => q.eq("status", "received"))
      .collect();

    const stale = pendingEvents.filter((event) => event.receivedAt < threshold);

    await Promise.all(
      stale.map((event) =>
        ctx.db.patch(event._id, {
          status: "failed",
          processedAt: Date.now(),
          error: "Timed out awaiting processing",
        }),
      ),
    );

    return stale.length;
  },
});
