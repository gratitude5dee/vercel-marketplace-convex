"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskGraphPanel } from "@/components/panels/TaskGraphPanel";
import { TranscriptPanel } from "@/components/panels/TranscriptPanel";
import { MetricsPanel } from "@/components/panels/MetricsPanel";
import { PersonasPanel } from "@/components/panels/PersonasPanel";
import { ManagerActionTimelinePanel } from "@/components/panels/ManagerActionTimelinePanel";
import { MediaPanel } from "@/components/panels/MediaPanel";

const typedApi = api as any;

type TaskStatus = "pending" | "ready" | "in_progress" | "completed" | "failed";

export default function SessionDashboardPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = String(params.sessionId);

  const session = useQuery(typedApi.sessions.getById, { sessionId });
  const graph = useQuery(typedApi.tasks.listGraph, { sessionId });
  const personas = useQuery(typedApi.personas.listBySession, { sessionId }) ?? [];
  const metrics = useQuery(typedApi.metrics.getCurrent, { sessionId });
  const actions = useQuery(typedApi.managerActions.listRecent, { sessionId, limit: 60 }) ?? [];
  const media = useQuery(typedApi.media.listBySession, { sessionId }) ?? [];

  const assignTask = useMutation(typedApi.tasks.assignTask).withOptimisticUpdate(
    (localStore: any, args: { sessionId: string; taskKey: string; assigneeUserId: string }) => {
      const current = localStore.getQuery(typedApi.tasks.listGraph, { sessionId: args.sessionId });
      if (!current) {
        return;
      }
      localStore.setQuery(typedApi.tasks.listGraph, { sessionId: args.sessionId }, {
        ...current,
        tasks: current.tasks.map((task: any) =>
          task.taskKey === args.taskKey
            ? { ...task, assigneeUserId: args.assigneeUserId, status: task.status === "pending" ? "ready" : task.status }
            : task,
        ),
      });
    },
  );

  const updateTaskStatus = useMutation(typedApi.tasks.updateTaskStatus).withOptimisticUpdate(
    (localStore: any, args: { sessionId: string; taskKey: string; status: TaskStatus }) => {
      const current = localStore.getQuery(typedApi.tasks.listGraph, { sessionId: args.sessionId });
      if (!current) {
        return;
      }
      localStore.setQuery(typedApi.tasks.listGraph, { sessionId: args.sessionId }, {
        ...current,
        tasks: current.tasks.map((task: any) =>
          task.taskKey === args.taskKey ? { ...task, status: args.status } : task,
        ),
      });
    },
  );

  const taskCount = useMemo(() => graph?.tasks.length ?? 0, [graph?.tasks.length]);

  if (session === undefined || graph === undefined || metrics === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-foreground/60">Loading session dashboard...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-foreground/60">Session not found.</p>
        <Link href="/" className="text-sm underline underline-offset-2 hover:opacity-80">
          Back to workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-foreground/50 font-mono">Session ID: {sessionId}</p>
          <h1 className="text-lg font-bold">{session.goalText}</h1>
        </div>
        <Link href="/" className="text-sm underline underline-offset-2 hover:opacity-80">
          Back
        </Link>
      </header>
      <div className="px-6 py-2 text-xs text-foreground/50 border-b border-foreground/10">
        {"Status: "}{session.status}{" \u00B7 Timestep "}{session.currentTimestep ?? 0}{" \u00B7 Tasks "}{taskCount}
      </div>

      <main className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskGraphPanel
            tasks={graph?.tasks ?? []}
            dependencies={graph?.dependencies ?? []}
            personas={personas}
            onAssign={(taskKey, assigneeUserId) => {
              void assignTask({ sessionId, taskKey, assigneeUserId });
            }}
            onStatusChange={(taskKey, status) => {
              void updateTaskStatus({ sessionId, taskKey, status });
            }}
          />
          <TranscriptPanel sessionId={sessionId} />
        </div>

        <MetricsPanel metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PersonasPanel personas={personas} />
          <ManagerActionTimelinePanel actions={actions} />
          <MediaPanel media={media} />
        </div>
      </main>
    </div>
  );
}
