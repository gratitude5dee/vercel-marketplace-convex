"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const typedApi = api as any;

const defaultTaskSeed = {
  nodes: [
    {
      taskKey: "goal-brief",
      label: "Confirm Goal Brief",
      description: "Validate objective and decision boundaries.",
      priority: 1,
      estimatedHours: 1,
    },
    {
      taskKey: "dependency-map",
      label: "Map Dependencies",
      description: "Capture sequencing and blockers.",
      priority: 1,
      estimatedHours: 2,
    },
    {
      taskKey: "assignment",
      label: "Assign Owners",
      description: "Assign each critical-path task to an owner.",
      priority: 2,
      estimatedHours: 1,
    },
    {
      taskKey: "alignment-review",
      label: "Run Alignment Review",
      description: "Confirm plan against constitution and stakeholder preferences.",
      priority: 2,
      estimatedHours: 1,
    },
  ],
  edges: [
    { fromTaskKey: "goal-brief", toTaskKey: "dependency-map" },
    { fromTaskKey: "dependency-map", toTaskKey: "assignment" },
    { fromTaskKey: "assignment", toTaskKey: "alignment-review" },
  ],
};

export default function HomePage() {
  const [workspaceName, setWorkspaceName] = useState("MorphicFields Workspace");
  const [goalText, setGoalText] = useState("Coordinate a multi-human roadmap discussion.");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  const workspaces = useQuery(typedApi.workspaces.listMine, {}) ?? [];
  const sessions = useQuery(
    typedApi.sessions.listByWorkspace,
    selectedWorkspace ? { workspaceId: selectedWorkspace } : "skip",
  );

  const createWorkspace = useMutation(typedApi.workspaces.create);
  const createSession = useMutation(typedApi.sessions.create);
  const seedFromGoal = useMutation(typedApi.tasks.seedFromGoal);

  useEffect(() => {
    if (!selectedWorkspace && workspaces[0]) {
      setSelectedWorkspace(workspaces[0].workspaceId);
    }
  }, [workspaces, selectedWorkspace]);

  const workspaceOptions = useMemo(
    () =>
      workspaces.map((workspace: any) => ({
        value: workspace.workspaceId,
        label: `${workspace.name} (${workspace.role})`,
      })),
    [workspaces],
  );

  const handleCreateWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = workspaceName.trim();
    if (!trimmed) {
      return;
    }
    const workspaceId = await createWorkspace({ name: trimmed });
    setSelectedWorkspace(workspaceId);
  };

  const handleCreateSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedWorkspace || !goalText.trim()) {
      return;
    }

    const sessionId = await createSession({
      workspaceId: selectedWorkspace,
      goalText: goalText.trim(),
      initialRules: [
        "Keep coordination transparent and concise.",
        "Request explicit authorization before major scope shifts.",
      ],
    });

    await seedFromGoal({
      sessionId,
      nodes: defaultTaskSeed.nodes,
      edges: defaultTaskSeed.edges,
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-semibold">MorphicFields</h1>
          <p className="text-slate-600 mt-2 max-w-3xl">
            Production-oriented Vapi + Convex dashboard for multi-human agent orchestration.
            Create a workspace, spin up a session, and open the live session dashboard.
          </p>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <form onSubmit={handleCreateWorkspace} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold">Create Workspace</h2>
            <input
              className="mt-3 w-full rounded border border-slate-300 px-3 py-2"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Workspace name"
            />
            <button
              type="submit"
              className="mt-3 rounded bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-700"
            >
              Create Workspace
            </button>
          </form>

          <form onSubmit={handleCreateSession} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold">Create Session</h2>
            <select
              className="mt-3 w-full rounded border border-slate-300 px-3 py-2"
              value={selectedWorkspace ?? ""}
              onChange={(event) => setSelectedWorkspace(event.target.value)}
            >
              <option value="" disabled>
                Select workspace
              </option>
              {workspaceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <textarea
              className="mt-3 w-full rounded border border-slate-300 px-3 py-2"
              rows={3}
              value={goalText}
              onChange={(event) => setGoalText(event.target.value)}
            />
            <button
              type="submit"
              disabled={!selectedWorkspace}
              className="mt-3 rounded bg-blue-700 text-white px-4 py-2 text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              Create Session + Seed Graph
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold">Sessions</h2>
          {!selectedWorkspace ? (
            <p className="text-sm text-slate-500 mt-3">Select a workspace to view sessions.</p>
          ) : sessions === undefined ? (
            <p className="text-sm text-slate-500 mt-3">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">No sessions yet in this workspace.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {sessions.map((session: any) => (
                <div
                  key={session.sessionId}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div>
                    <p className="font-medium">{session.goalText}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Status: {session.status} · Started {new Date(session.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <Link className="text-blue-700 underline" href={`/sessions/${session.sessionId}`}>
                      Open dashboard
                    </Link>
                    <Link className="text-blue-700 underline" href={`/sessions/${session.sessionId}/replay`}>
                      Replay
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
