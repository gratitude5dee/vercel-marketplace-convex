import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireIdentity } from "./lib/authz";

// ---------------------------------------------------------------------------
// Phone Channels — shared phone number config per workspace
// ---------------------------------------------------------------------------

export const listByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db
      .query("phoneChannels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const getDefault = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db
      .query("phoneChannels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const getDefaultInternal = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phoneChannels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    phoneNumber: v.string(),
    label: v.string(),
    vapiPhoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db.insert("phoneChannels", {
      workspaceId: args.workspaceId,
      phoneNumber: args.phoneNumber,
      vapiPhoneNumberId: args.vapiPhoneNumberId,
      label: args.label,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    channelId: v.id("phoneChannels"),
    isActive: v.optional(v.boolean()),
    label: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const { channelId, ...patch } = args;
    const updates: Record<string, unknown> = {};
    if (patch.isActive !== undefined) updates.isActive = patch.isActive;
    if (patch.label !== undefined) updates.label = patch.label;
    if (patch.phoneNumber !== undefined) updates.phoneNumber = patch.phoneNumber;
    await ctx.db.patch(channelId, updates);
  },
});

export const remove = mutation({
  args: { channelId: v.id("phoneChannels") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    await ctx.db.delete(args.channelId);
  },
});
