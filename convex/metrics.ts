import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { dashboardMetricsValidator } from "./lib/contracts";
import { requireWorkspaceMembership } from "./lib/authz";

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export const getCurrent = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.union(dashboardMetricsValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const current = await ctx.db
      .query("sessionMetricsCurrent")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    return current
      ? {
          sessionId: current.sessionId,
          goalAchievement: current.goalAchievement,
          constraintAdherence: current.constraintAdherence,
          alignmentScore: current.alignmentScore,
          stakeholderMgmt: current.stakeholderMgmt,
          runtimeHours: current.runtimeHours,
          totalTasks: current.totalTasks,
          completedTasks: current.completedTasks,
          updatedAt: current.updatedAt,
        }
      : null;
  },
});

export const recompute = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: dashboardMetricsValidator,
  handler: async (ctx, args) => {
    const [tasks, dependencies, managerActions, latestConstitution] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("taskDependencies")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("managerActions")
        .withIndex("by_session_and_time", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("constitutions")
        .withIndex("by_session_and_version", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .first(),
    ]);

    const weights = tasks.map((task) => 4 - Math.max(1, Math.min(3, task.priority)));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const completedWeight = tasks
      .filter((task) => task.status === "completed")
      .reduce(
        (sum, task) => sum + 4 - Math.max(1, Math.min(3, task.priority)),
        0,
      );

    const goalAchievement = totalWeight > 0 ? completedWeight / totalWeight : 0;

    const completedTaskKeys = new Set(
      tasks.filter((task) => task.status === "completed").map((task) => task.taskKey),
    );

    const satisfiedConstraints = dependencies.filter((dependency) =>
      completedTaskKeys.has(dependency.fromTaskKey),
    ).length;
    const constraintAdherence =
      dependencies.length > 0 ? satisfiedConstraints / dependencies.length : 1;

    const alignmentScore = latestConstitution?.stabilityScore ?? 0.5;

    const managerSpeakCount = managerActions.filter(
      (action) => action.actionType === "SPEAK" || action.actionType === "INVOKE_HUMAN",
    ).length;
    const stakeholderMgmt = clamp(managerSpeakCount / 10);

    const runtimeHours = tasks.reduce((sum, task) => {
      const estimate = task.estimatedHours ?? 1;
      if (task.status === "completed") {
        return sum + estimate;
      }
      if (task.status === "in_progress") {
        return sum + estimate * 0.5;
      }
      return sum;
    }, 0);

    const payload = {
      sessionId: args.sessionId,
      goalAchievement: Number(clamp(goalAchievement).toFixed(3)),
      constraintAdherence: Number(clamp(constraintAdherence).toFixed(3)),
      alignmentScore: Number(clamp(alignmentScore).toFixed(3)),
      stakeholderMgmt: Number(clamp(stakeholderMgmt).toFixed(3)),
      runtimeHours: Number(runtimeHours.toFixed(2)),
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.status === "completed").length,
      updatedAt: Date.now(),
    };

    const current = await ctx.db
      .query("sessionMetricsCurrent")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (current) {
      await ctx.db.patch("sessionMetricsCurrent", current._id, payload);
    } else {
      await ctx.db.insert("sessionMetricsCurrent", payload);
    }

    return payload;
  },
});

export const rollupForDate = internalMutation({
  args: {
    dateKey: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const currentMetrics = await ctx.db.query("sessionMetricsCurrent").collect();

    await Promise.all(
      currentMetrics.map(async (metric) => {
        const existing = await ctx.db
          .query("sessionMetricsDaily")
          .withIndex("by_session_and_date", (q) =>
            q.eq("sessionId", metric.sessionId).eq("dateKey", args.dateKey),
          )
          .unique();

        if (existing) {
          const samples = existing.samples + 1;
          const weighted = (prev: number, next: number) =>
            Number((((prev * existing.samples) + next) / samples).toFixed(3));

          await ctx.db.patch("sessionMetricsDaily", existing._id, {
            goalAchievement: weighted(existing.goalAchievement, metric.goalAchievement),
            constraintAdherence: weighted(existing.constraintAdherence, metric.constraintAdherence),
            alignmentScore: weighted(existing.alignmentScore, metric.alignmentScore),
            stakeholderMgmt: weighted(existing.stakeholderMgmt, metric.stakeholderMgmt),
            runtimeHours: weighted(existing.runtimeHours, metric.runtimeHours),
            samples,
            updatedAt: Date.now(),
          });
          return;
        }

        await ctx.db.insert("sessionMetricsDaily", {
          sessionId: metric.sessionId,
          dateKey: args.dateKey,
          goalAchievement: metric.goalAchievement,
          constraintAdherence: metric.constraintAdherence,
          alignmentScore: metric.alignmentScore,
          stakeholderMgmt: metric.stakeholderMgmt,
          runtimeHours: metric.runtimeHours,
          samples: 1,
          updatedAt: Date.now(),
        });
      }),
    );

    return currentMetrics.length;
  },
});
