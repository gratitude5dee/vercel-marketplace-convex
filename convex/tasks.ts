import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  sessionGraphEdgeValidator,
  sessionGraphNodeValidator,
  taskStatusValidator,
} from "./lib/contracts";
import { requireWorkspaceMembership } from "./lib/authz";

const seedNodeValidator = v.object({
  taskKey: v.string(),
  label: v.string(),
  description: v.optional(v.string()),
  estimatedHours: v.optional(v.number()),
  priority: v.optional(v.number()),
});

const dependencyInputValidator = v.object({
  fromTaskKey: v.string(),
  toTaskKey: v.string(),
});

async function getTaskByKey(
  ctx: { db: any },
  sessionId: string,
  taskKey: string,
) {
  return await ctx.db
    .query("tasks")
    .withIndex("by_session_and_key", (q: any) =>
      q.eq("sessionId", sessionId).eq("taskKey", taskKey),
    )
    .unique();
}

async function recomputeReadiness(ctx: { db: any }, sessionId: string) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
    .collect();

  const dependencies = await ctx.db
    .query("taskDependencies")
    .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
    .collect();

  const statusByTaskKey = new Map(tasks.map((task: any) => [task.taskKey, task.status]));

  await Promise.all(
    tasks.map(async (task: any) => {
      if (task.status === "completed" || task.status === "failed") {
        return;
      }

      const blockers = dependencies
        .filter((edge: any) => edge.toTaskKey === task.taskKey)
        .map((edge: any) => edge.fromTaskKey);
      const isReady = blockers.every(
        (blockerTaskKey: string) => statusByTaskKey.get(blockerTaskKey) === "completed",
      );

      const nextStatus = isReady ? "ready" : "pending";
      if (task.status === "in_progress") {
        return;
      }

      if (task.status !== nextStatus) {
        await ctx.db.patch(task._id, {
          status: nextStatus,
          updatedAt: Date.now(),
        });
      }
    }),
  );
}

export const listGraph = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    tasks: v.array(sessionGraphNodeValidator),
    dependencies: v.array(sessionGraphEdgeValidator),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const [tasks, dependencies] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("taskDependencies")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
    ]);

    return {
      tasks: tasks.sort((a, b) => a.priority - b.priority),
      dependencies,
    };
  },
});

export const seedFromGoal = mutation({
  args: {
    sessionId: v.id("sessions"),
    nodes: v.array(seedNodeValidator),
    edges: v.array(dependencyInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    await Promise.all(existingTasks.map((task) => ctx.db.delete(task._id)));

    const existingEdges = await ctx.db
      .query("taskDependencies")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    await Promise.all(existingEdges.map((edge) => ctx.db.delete(edge._id)));

    const now = Date.now();
    await Promise.all(
      args.nodes.map((node, index) =>
        ctx.db.insert("tasks", {
          sessionId: args.sessionId,
          taskKey: node.taskKey,
          label: node.label,
          description: node.description,
          status: "pending",
          estimatedHours: node.estimatedHours,
          priority: node.priority ?? Math.min(3, index + 1),
          updatedAt: now,
        }),
      ),
    );

    await Promise.all(
      args.edges.map((edge) =>
        ctx.db.insert("taskDependencies", {
          sessionId: args.sessionId,
          fromTaskKey: edge.fromTaskKey,
          toTaskKey: edge.toTaskKey,
        }),
      ),
    );

    await recomputeReadiness(ctx, args.sessionId);
    return null;
  },
});

export const assignTask = mutation({
  args: {
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    assigneeUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const task = await getTaskByKey(ctx, args.sessionId, args.taskKey);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    await ctx.db.patch(task._id, {
      assigneeUserId: args.assigneeUserId,
      status: task.status === "pending" ? "ready" : task.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateTaskStatus = mutation({
  args: {
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    status: taskStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const task = await getTaskByKey(ctx, args.sessionId, args.taskKey);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    await ctx.db.patch(task._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await recomputeReadiness(ctx, args.sessionId);

    return null;
  },
});

export const addDependency = mutation({
  args: {
    sessionId: v.id("sessions"),
    fromTaskKey: v.string(),
    toTaskKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const existingEdge = await ctx.db
      .query("taskDependencies")
      .withIndex("by_session_and_pair", (q) =>
        q
          .eq("sessionId", args.sessionId)
          .eq("fromTaskKey", args.fromTaskKey)
          .eq("toTaskKey", args.toTaskKey),
      )
      .unique();

    if (!existingEdge) {
      await ctx.db.insert("taskDependencies", {
        sessionId: args.sessionId,
        fromTaskKey: args.fromTaskKey,
        toTaskKey: args.toTaskKey,
      });
    }

    await recomputeReadiness(ctx, args.sessionId);
    return null;
  },
});

export const refineTask = mutation({
  args: {
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    outputs: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const task = await getTaskByKey(ctx, args.sessionId, args.taskKey);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    await ctx.db.patch(task._id, {
      label: args.label ?? task.label,
      description: args.description ?? task.description,
      priority: args.priority ?? task.priority,
      estimatedHours: args.estimatedHours ?? task.estimatedHours,
      outputs: args.outputs ?? task.outputs,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const assignTaskInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    assigneeUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await getTaskByKey(ctx, args.sessionId, args.taskKey);
    if (!task) {
      return null;
    }

    await ctx.db.patch(task._id, {
      assigneeUserId: args.assigneeUserId,
      status: task.status === "pending" ? "ready" : task.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateTaskStatusInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    status: taskStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await getTaskByKey(ctx, args.sessionId, args.taskKey);
    if (!task) {
      return null;
    }

    await ctx.db.patch(task._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await recomputeReadiness(ctx, args.sessionId);

    return null;
  },
});

export const listGraphInternal = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    tasks: v.array(sessionGraphNodeValidator),
    dependencies: v.array(sessionGraphEdgeValidator),
  }),
  handler: async (ctx, args) => {
    const [tasks, dependencies] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("taskDependencies")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
    ]);

    return {
      tasks,
      dependencies,
    };
  },
});
