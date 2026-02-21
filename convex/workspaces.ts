import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireIdentity } from "./lib/authz";

export const create = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("workspaces"),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      createdBy: identity.subject,
      createdAt: now,
      status: "active",
    });

    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: identity.subject,
      role: "owner",
      joinedAt: now,
    });

    return workspaceId;
  },
});

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      workspaceId: v.id("workspaces"),
      name: v.string(),
      role: v.string(),
      status: v.string(),
      createdAt: v.number(),
      memberCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await ctx.db.get(membership.workspaceId);
        if (!workspace) {
          return null;
        }

        const memberCount = await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace", (q) =>
            q.eq("workspaceId", membership.workspaceId),
          )
          .collect();

        return {
          workspaceId: workspace._id,
          name: workspace.name,
          role: membership.role,
          status: workspace.status,
          createdAt: workspace.createdAt,
          memberCount: memberCount.length,
        };
      }),
    );

    return workspaces
      .filter((workspace) => workspace !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const actingMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
      )
      .unique();

    if (!actingMember || (actingMember.role !== "owner" && actingMember.role !== "admin")) {
      throw new ConvexError("Only workspace owners/admins can add members.");
    }

    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
      });
      return null;
    }

    await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      role: args.role,
      joinedAt: Date.now(),
    });

    return null;
  },
});
