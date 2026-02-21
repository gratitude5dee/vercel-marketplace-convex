import { ConvexError, v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  participantAuthorityValidator,
  participantCapabilitiesValidator,
  participantInformationValidator,
  participantStyleValidator,
} from "./lib/contracts";
import { requireIdentity, requireWorkspaceMembership } from "./lib/authz";

const personaViewValidator = v.object({
  personaId: v.id("participantPersonas"),
  workspaceId: v.id("workspaces"),
  sessionId: v.optional(v.id("sessions")),
  userId: v.string(),
  displayName: v.optional(v.string()),
  style: participantStyleValidator,
  capabilities: participantCapabilitiesValidator,
  information: participantInformationValidator,
  authority: participantAuthorityValidator,
  profileCompleteness: v.number(),
  updatedAt: v.number(),
});

function getProfileCompleteness(input: {
  capabilities: { cognitiveJudgment: number; creativity: number; externalInteraction: number };
  information: { domainExpertise: string[]; privateKnowledge: number; preferenceClarity: number };
  authority: { responsibilityScope: "full" | "shared" | "delegated"; authorizableContent: string[] };
  displayName?: string;
}) {
  let score = 0;
  score += input.displayName ? 0.1 : 0;
  score += Math.min(input.information.domainExpertise.length, 5) * 0.08;
  score += (input.capabilities.cognitiveJudgment + input.capabilities.creativity + input.capabilities.externalInteraction) * 0.15;
  score += (input.information.privateKnowledge + input.information.preferenceClarity) * 0.15;
  score += input.authority.authorizableContent.length > 0 ? 0.15 : 0;
  score += input.authority.responsibilityScope === "full" ? 0.1 : 0.06;
  return Math.min(1, Number(score.toFixed(2)));
}

export const upsert = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    sessionId: v.optional(v.id("sessions")),
    displayName: v.optional(v.string()),
    style: participantStyleValidator,
    capabilities: participantCapabilitiesValidator,
    information: participantInformationValidator,
    authority: participantAuthorityValidator,
    lowReturnMoments: v.optional(v.array(v.number())),
  },
  returns: v.id("participantPersonas"),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireWorkspaceMembership(ctx, args.workspaceId);

    const existing = await ctx.db
      .query("participantPersonas")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
      )
      .collect();

    const scopedExisting = existing.find(
      (persona) => persona.sessionId === args.sessionId,
    );

    const payload = {
      workspaceId: args.workspaceId,
      sessionId: args.sessionId,
      userId: identity.subject,
      displayName: args.displayName,
      capabilities: args.capabilities,
      information: args.information,
      authority: args.authority,
      style: args.style,
      lowReturnMoments: args.lowReturnMoments,
      updatedAt: Date.now(),
    };

    if (scopedExisting) {
      await ctx.db.patch("participantPersonas", scopedExisting._id, payload);
      return scopedExisting._id;
    }

    return await ctx.db.insert("participantPersonas", payload);
  },
});

export const listBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(personaViewValidator),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const personas = await ctx.db
      .query("participantPersonas")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return personas.map((persona) => ({
      personaId: persona._id,
      workspaceId: persona.workspaceId,
      sessionId: persona.sessionId,
      userId: persona.userId,
      displayName: persona.displayName,
      style: persona.style,
      capabilities: persona.capabilities,
      information: persona.information,
      authority: persona.authority,
      profileCompleteness: getProfileCompleteness(persona),
      updatedAt: persona.updatedAt,
    }));
  },
});

export const getByUser = query({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
  },
  returns: v.union(personaViewValidator, v.null()),
  handler: async (ctx, args) => {
    await requireWorkspaceMembership(ctx, args.workspaceId);

    const persona = await ctx.db
      .query("participantPersonas")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .first();

    if (!persona) {
      return null;
    }

    return {
      personaId: persona._id,
      workspaceId: persona.workspaceId,
      sessionId: persona.sessionId,
      userId: persona.userId,
      displayName: persona.displayName,
      style: persona.style,
      capabilities: persona.capabilities,
      information: persona.information,
      authority: persona.authority,
      profileCompleteness: getProfileCompleteness(persona),
      updatedAt: persona.updatedAt,
    };
  },
});

export const getBySessionInternal = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      displayName: v.optional(v.string()),
      style: participantStyleValidator,
      capabilities: participantCapabilitiesValidator,
      information: participantInformationValidator,
      authority: participantAuthorityValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const personas = await ctx.db
      .query("participantPersonas")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return personas.map((persona) => ({
      userId: persona.userId,
      displayName: persona.displayName,
      style: persona.style,
      capabilities: persona.capabilities,
      information: persona.information,
      authority: persona.authority,
    }));
  },
});
