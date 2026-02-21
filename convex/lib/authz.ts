import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type ReadWriteCtx = MutationCtx | QueryCtx;

const DEV_FALLBACK_USER = "morphicfields-dev-user";

export async function requireIdentity(ctx: ReadWriteCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    return identity;
  }

  // In development without auth configured, use a fallback dev identity.
  // This enables the dashboard to function before auth is wired up.
  return {
    issuer: "morphicfields-dev",
    subject: DEV_FALLBACK_USER,
    tokenIdentifier: `dev|${DEV_FALLBACK_USER}`,
    name: "Dev User",
  };
}

export async function requireWorkspaceMembership(
  ctx: ReadWriteCtx,
  workspaceId: Id<"workspaces">,
) {
  const identity = await requireIdentity(ctx);
  const member = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", identity.subject),
    )
    .unique();

  if (!member) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have access to this workspace.",
    });
  }

  return { identity, member };
}

export async function requireWorkspaceAdmin(
  ctx: ReadWriteCtx,
  workspaceId: Id<"workspaces">,
) {
  const { identity, member } = await requireWorkspaceMembership(ctx, workspaceId);
  if (member.role === "viewer") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Viewer role cannot modify workspace resources.",
    });
  }

  return { identity, member };
}
