"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ConvexErrorBoundary } from "@/components/ConvexErrorBoundary";

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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 px-6 py-4">
        <h1 className="text-2xl font-bold font-sans">MorphicFields</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Production-oriented Vapi + Convex dashboard for multi-human agent
          orchestration. Create a workspace, spin up a session, and open the
          live session dashboard.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
        <ConvexErrorBoundary>
          <Dashboard />
        </ConvexErrorBoundary>
      </main>
    </div>
  );
}

function Dashboard() {
  const [workspaceName, setWorkspaceName] = useState("MorphicFields Workspace");
  const [goalText, setGoalText] = useState(
    "Coordinate a multi-human roadmap discussion.",
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );

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
    if (!trimmed) return;
    const workspaceId = await createWorkspace({ name: trimmed });
    setSelectedWorkspace(workspaceId);
  };

  const handleCreateSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedWorkspace || !goalText.trim()) return;

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
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Create Workspace</h2>
        <form onSubmit={handleCreateWorkspace} className="flex gap-2">
          <input
            className="flex-1 border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Workspace name"
          />
          <button
            type="submit"
            className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create Workspace
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Create Session</h2>
        <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
          <select
            className="border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm"
            value={selectedWorkspace ?? ""}
            onChange={(event) => setSelectedWorkspace(event.target.value)}
          >
            <option value="" disabled>
              Select workspace
            </option>
            {workspaceOptions.map(
              (option: { value: string; label: string }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
          <input
            className="border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm"
            value={goalText}
            onChange={(event) => setGoalText(event.target.value)}
          />
          <button
            type="submit"
            className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity self-start"
          >
            Create Session + Seed Graph
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Sessions</h2>
        {!selectedWorkspace ? (
          <p className="text-sm text-foreground/60">
            Select a workspace to view sessions.
          </p>
        ) : sessions === undefined ? (
          <p className="text-sm text-foreground/60">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No sessions yet in this workspace.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session: any) => (
              <li
                key={session.sessionId}
                className="border border-foreground/10 rounded-lg p-4 flex flex-col gap-2"
              >
                <p className="font-medium">{session.goalText}</p>
                <p className="text-xs text-foreground/50">
                  {"Status: "}
                  {session.status}
                  {" \u00B7 Started "}
                  {new Date(session.startedAt).toLocaleString()}
                </p>
                <div className="flex gap-3">
                  <Link
                    href={`/sessions/${session.sessionId}`}
                    className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
                  >
                    Open dashboard
                  </Link>
                  <Link
                    href={`/sessions/${session.sessionId}/replay`}
                    className="text-sm text-foreground/60 underline underline-offset-2 hover:opacity-80"
                  >
                    Replay
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
