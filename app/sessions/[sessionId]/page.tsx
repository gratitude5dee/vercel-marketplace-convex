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
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-600">Loading session dashboard…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-600">Session not found.</p>
        <Link className="text-blue-700 underline" href="/">
          Back to workspaces
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Session ID: {sessionId}</p>
              <h1 className="text-xl font-semibold text-slate-900">{session.goalText}</h1>
            </div>
            <Link className="text-blue-700 underline text-sm" href="/">
              Back
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            Status: {session.status} · Timestep {session.currentTimestep ?? 0} · Tasks {taskCount}
          </p>
        </header>

        <MetricsPanel metrics={metrics} />

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
          <TaskGraphPanel
            tasks={graph.tasks}
            dependencies={graph.dependencies}
            personas={personas}
            onAssign={(taskKey, assigneeUserId) => {
              void assignTask({ sessionId, taskKey, assigneeUserId });
            }}
            onStatusChange={(taskKey, status) => {
              void updateTaskStatus({ sessionId, taskKey, status });
            }}
          />
          <div className="space-y-4">
            <PersonasPanel personas={personas} />
            <ManagerActionTimelinePanel actions={actions} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <TranscriptPanel sessionId={sessionId} />
          <MediaPanel media={media} />
        </div>
      </div>
    </main>
  );
}
