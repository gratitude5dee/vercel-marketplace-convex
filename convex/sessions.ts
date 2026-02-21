import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireIdentity, requireWorkspaceMembership } from "./lib/authz";

const sessionSummaryValidator = v.object({
  sessionId: v.id("sessions"),
  workspaceId: v.id("workspaces"),
  goalText: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("paused"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  vapiCallId: v.optional(v.string()),
  currentTimestep: v.optional(v.number()),
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    goalText: v.string(),
    initialRules: v.optional(v.array(v.string())),
  },
  returns: v.id("sessions"),
  handler: async (ctx, args) => {
    await requireWorkspaceMembership(ctx, args.workspaceId);

    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      workspaceId: args.workspaceId,
      goalText: args.goalText,
      status: "active",
      startedAt: now,
      currentTimestep: 0,
    });

    await ctx.db.insert("constitutions", {
      sessionId,
      version: 1,
      rules: (args.initialRules ?? [
        "Keep updates concise and actionable.",
        "Explicitly ask for approval before irreversible decisions.",
      ]).map((ruleText) => ({
        text: ruleText,
        source: "seed" as const,
        confidence: 0.7,
      })),
      stabilityScore: 0.5,
      createdAt: now,
    });

    await ctx.db.insert("sessionMetricsCurrent", {
      sessionId,
      goalAchievement: 0,
      constraintAdherence: 1,
      alignmentScore: 0.5,
      stakeholderMgmt: 0,
      runtimeHours: 0,
      totalTasks: 0,
      completedTasks: 0,
      updatedAt: now,
    });

    return sessionId;
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
  },
  returns: v.array(sessionSummaryValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMembership(ctx, args.workspaceId);

    if (args.status) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_workspace_and_status", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("status", args.status),
        )
        .order("desc")
        .collect();
      return sessions.map((session) => ({
        sessionId: session._id,
        workspaceId: session.workspaceId,
        goalText: session.goalText,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        vapiCallId: session.vapiCallId,
        currentTimestep: session.currentTimestep,
      }));
    }

    const allStatuses = ["active", "paused", "completed", "failed"] as const;
    const grouped = await Promise.all(
      allStatuses.map((status) =>
        ctx.db
          .query("sessions")
          .withIndex("by_workspace_and_status", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("status", status),
          )
          .collect(),
      ),
    );

    return grouped
      .flat()
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((session) => ({
        sessionId: session._id,
        workspaceId: session.workspaceId,
        goalText: session.goalText,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        vapiCallId: session.vapiCallId,
        currentTimestep: session.currentTimestep,
      }));
  },
});

export const getById = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.union(sessionSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);
    return {
      sessionId: session._id,
      workspaceId: session.workspaceId,
      goalText: session.goalText,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      vapiCallId: session.vapiCallId,
      currentTimestep: session.currentTimestep,
    };
  },
});

export const pause = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    if (session.status === "completed") {
      throw new ConvexError("Completed sessions cannot be paused");
    }

    await ctx.db.patch(args.sessionId, {
      status: "paused",
    });

    return null;
  },
});

export const complete = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      endedAt: Date.now(),
    });

    return null;
  },
});

export const markCompleteInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      endedAt: Date.now(),
    });

    return null;
  },
});

export const joinSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    displayName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    const identity = await requireIdentity(ctx);
    await requireWorkspaceMembership(ctx, session.workspaceId);

    const existingPersonas = await ctx.db
      .query("participantPersonas")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", session.workspaceId).eq("userId", identity.subject),
      )
      .collect();

    const existingPersona = existingPersonas.find(
      (persona) => persona.sessionId === args.sessionId,
    );

    if (!existingPersona) {
      await ctx.db.insert("participantPersonas", {
        workspaceId: session.workspaceId,
        sessionId: args.sessionId,
        userId: identity.subject,
        displayName: args.displayName ?? identity.name,
        capabilities: {
          cognitiveJudgment: 0.6,
          creativity: 0.6,
          externalInteraction: 0.5,
        },
        information: {
          domainExpertise: [],
          privateKnowledge: 0.5,
          preferenceClarity: 0.5,
        },
        authority: {
          responsibilityScope: "shared",
          authorizableContent: ["task_assignment", "scope_changes"],
        },
        style: "concise",
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

export const bindVapiCall = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    callId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      vapiCallId: args.callId,
    });
    return null;
  },
});

export const incrementTimestep = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    await ctx.db.patch(args.sessionId, {
      currentTimestep: (session.currentTimestep ?? 0) + 1,
    });

    return null;
  },
});

export const getByIdInternal = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.union(
    v.object({
      sessionId: v.id("sessions"),
      workspaceId: v.id("workspaces"),
      goalText: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      vapiCallId: v.optional(v.string()),
      currentTimestep: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }
    return {
      sessionId: session._id,
      workspaceId: session.workspaceId,
      goalText: session.goalText,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      vapiCallId: session.vapiCallId,
      currentTimestep: session.currentTimestep,
    };
  },
});

export const getByCallId = internalQuery({
  args: {
    callId: v.string(),
  },
  returns: v.union(v.id("sessions"), v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.callId))
      .unique();
    return session?._id ?? null;
  },
});
