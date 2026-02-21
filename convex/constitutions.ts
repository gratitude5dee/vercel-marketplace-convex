import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { constitutionRuleValidator } from "./lib/contracts";
import { requireWorkspaceMembership } from "./lib/authz";

const constitutionViewValidator = v.object({
  _id: v.id("constitutions"),
  _creationTime: v.number(),
  sessionId: v.id("sessions"),
  version: v.number(),
  rules: v.array(constitutionRuleValidator),
  stabilityScore: v.number(),
  parentVersion: v.optional(v.number()),
  createdAt: v.number(),
});

export const getLatest = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.union(constitutionViewValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    return await ctx.db
      .query("constitutions")
      .withIndex("by_session_and_version", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

export const listVersions = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  returns: v.array(constitutionViewValidator),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    return await ctx.db
      .query("constitutions")
      .withIndex("by_session_and_version", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(args.limit ?? 10);
  },
});

export const evolve = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    latestTranscriptText: v.optional(v.string()),
  },
  returns: v.union(v.id("constitutions"), v.null()),
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("constitutions")
      .withIndex("by_session_and_version", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    if (!latest) {
      return null;
    }

    const transcriptText = (args.latestTranscriptText ?? "").toLowerCase();

    const evolvedRules = [...latest.rules];
    if (
      transcriptText.includes("prefer") ||
      transcriptText.includes("should") ||
      transcriptText.includes("must")
    ) {
      evolvedRules.push({
        text: `Evolved from session dialogue: ${args.latestTranscriptText?.slice(0, 100) ?? "Keep preferences explicit."}`,
        source: "evolved",
        confidence: 0.6,
      });
    }

    const deduped = evolvedRules.reduce<Array<(typeof evolvedRules)[number]>>((acc, rule) => {
      if (!acc.some((existingRule) => existingRule.text === rule.text)) {
        acc.push(rule);
      }
      return acc;
    }, []);

    if (deduped.length === latest.rules.length) {
      return null;
    }

    const newVersion = latest.version + 1;
    const stabilityScore = Math.min(1, Number((latest.stabilityScore + 0.05).toFixed(2)));

    return await ctx.db.insert("constitutions", {
      sessionId: args.sessionId,
      version: newVersion,
      rules: deduped,
      stabilityScore,
      parentVersion: latest.version,
      createdAt: Date.now(),
    });
  },
});

export const getLatestInternal = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.union(constitutionViewValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("constitutions")
      .withIndex("by_session_and_version", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});
