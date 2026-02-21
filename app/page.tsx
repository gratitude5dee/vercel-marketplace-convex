"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

// Local-first MorphicFields homepage.
// Operates in local-only demo mode (no Convex backend needed).

/* ---------- types -------------------------------------------------------- */

interface Workspace {
  workspaceId: string;
  name: string;
  role: string;
}

interface Session {
  sessionId: string;
  workspaceId: string;
  goalText: string;
  status: "active" | "paused" | "completed" | "failed";
  startedAt: number;
}

interface TaskNode {
  taskKey: string;
  label: string;
  description: string;
  priority: number;
  estimatedHours: number;
}

interface TaskEdge {
  fromTaskKey: string;
  toTaskKey: string;
}

interface PhoneChannel {
  id: string;
  phoneNumber: string;
  label: string;
  isActive: boolean;
}

/* ---------- seed data ---------------------------------------------------- */

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
      description:
        "Confirm plan against constitution and stakeholder preferences.",
      priority: 2,
      estimatedHours: 1,
    },
  ] as TaskNode[],
  edges: [
    { fromTaskKey: "goal-brief", toTaskKey: "dependency-map" },
    { fromTaskKey: "dependency-map", toTaskKey: "assignment" },
    { fromTaskKey: "assignment", toTaskKey: "alignment-review" },
  ] as TaskEdge[],
};

/* ---------- id helper ---------------------------------------------------- */
let _counter = 0;
function localId(prefix: string) {
  _counter += 1;
  return `${prefix}_${Date.now()}_${_counter}`;
}

/* ========================================================================= */
/*  Page                                                                     */
/* ========================================================================= */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* header */}
      <header className="border-b border-foreground/10 px-6 py-4">
        <h1 className="text-2xl font-bold font-sans text-balance">
          MorphicFields
        </h1>
        <p className="text-sm text-foreground/60 mt-1 max-w-2xl leading-relaxed">
          Production-oriented Vapi + Convex dashboard for multi-human agent
          orchestration. Create a workspace, spin up a session, and open the
          live session dashboard.
        </p>
      </header>

      {/* body */}
      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-10">
        <Dashboard />
      </main>
    </div>
  );
}

/* ========================================================================= */
/*  Dashboard (local-state driven)                                           */
/* ========================================================================= */

function Dashboard() {
  /* ---- state ----------------------------------------------------------- */
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [graphs, setGraphs] = useState<
    Record<string, { nodes: TaskNode[]; edges: TaskEdge[] }>
  >({});

  const [workspaceName, setWorkspaceName] = useState("MorphicFields Workspace");
  const [goalText, setGoalText] = useState(
    "Coordinate a multi-human roadmap discussion.",
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phoneChannels, setPhoneChannels] = useState<PhoneChannel[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneLabelInput, setPhoneLabelInput] = useState("Main Line");

  /* ---- derived --------------------------------------------------------- */
  const filteredSessions = useMemo(
    () =>
      selectedWorkspace
        ? sessions.filter((s) => s.workspaceId === selectedWorkspace)
        : [],
    [sessions, selectedWorkspace],
  );

  /* ---- auto-select first workspace ------------------------------------- */
  useEffect(() => {
    if (!selectedWorkspace && workspaces.length > 0) {
      setSelectedWorkspace(workspaces[0].workspaceId);
    }
  }, [workspaces, selectedWorkspace]);

  /* ---- handlers -------------------------------------------------------- */
  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  const handleCreateWorkspace = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = workspaceName.trim();
    if (!trimmed) return;
    const id = localId("ws");
    const ws: Workspace = { workspaceId: id, name: trimmed, role: "owner" };
    setWorkspaces((prev) => [...prev, ws]);
    setSelectedWorkspace(id);
    showFeedback(`Workspace "${trimmed}" created.`);
  };

  const handleSetPhoneChannel = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = phoneInput.trim();
    if (!trimmed || !selectedWorkspace) return;
    const id = localId("phone");
    setPhoneChannels((prev) => [
      ...prev,
      {
        id,
        phoneNumber: trimmed,
        label: phoneLabelInput.trim() || "Main Line",
        isActive: true,
      },
    ]);
    setPhoneInput("");
    showFeedback(`Phone channel "${trimmed}" added.`);
  };

  const handleToggleChannel = (channelId: string) => {
    setPhoneChannels((prev) =>
      prev.map((ch) =>
        ch.id === channelId ? { ...ch, isActive: !ch.isActive } : ch,
      ),
    );
  };

  const handleRemoveChannel = (channelId: string) => {
    setPhoneChannels((prev) => prev.filter((ch) => ch.id !== channelId));
  };

  const handleCreateSession = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !goalText.trim()) return;

    const id = localId("sess");
    const sess: Session = {
      sessionId: id,
      workspaceId: selectedWorkspace,
      goalText: goalText.trim(),
      status: "active",
      startedAt: Date.now(),
    };
    setSessions((prev) => [...prev, sess]);
    setGraphs((prev) => ({
      ...prev,
      [id]: { nodes: defaultTaskSeed.nodes, edges: defaultTaskSeed.edges },
    }));
    showFeedback(`Session created with ${defaultTaskSeed.nodes.length} seed tasks.`);
  };

  /* ---- render ---------------------------------------------------------- */
  return (
    <>
      {/* toast feedback */}
      {feedback && (
        <div className="fixed top-4 right-4 z-50 bg-foreground text-background text-sm px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          {feedback}
        </div>
      )}

      {/* create workspace */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Create Workspace</h2>
        <form
          onSubmit={handleCreateWorkspace}
          className="flex items-center gap-3"
        >
          <input
            className="flex-1 border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Workspace name"
          />
          <button
            type="submit"
            className="shrink-0 bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create Workspace
          </button>
        </form>
      </section>

      {/* create session */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Create Session</h2>
        <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
          <select
            className="border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
            value={selectedWorkspace ?? ""}
            onChange={(e) => setSelectedWorkspace(e.target.value || null)}
          >
            <option value="" disabled>
              Select workspace
            </option>
            {workspaces.map((ws) => (
              <option key={ws.workspaceId} value={ws.workspaceId}>
                {ws.name} ({ws.role})
              </option>
            ))}
          </select>

          <input
            className="border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="Session goal"
          />

          <button
            type="submit"
            disabled={!selectedWorkspace}
            className="self-start bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Session + Seed Graph
          </button>
        </form>
      </section>

      {/* phone channel config */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Phone Channel</h2>
        <p className="text-xs text-foreground/50 leading-relaxed">
          Configure a shared phone number for multi-human voice interactions.
          Worker agents call participants on this number.
        </p>
        <form onSubmit={handleSetPhoneChannel} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              className="flex-1 border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+1 555 123 4567"
            />
            <input
              className="w-36 border border-foreground/20 rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
              value={phoneLabelInput}
              onChange={(e) => setPhoneLabelInput(e.target.value)}
              placeholder="Label"
            />
            <button
              type="submit"
              disabled={!selectedWorkspace || !phoneInput.trim()}
              className="shrink-0 bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Set Channel
            </button>
          </div>
        </form>

        {phoneChannels.length > 0 && (
          <ul className="flex flex-col gap-2">
            {phoneChannels.map((ch) => (
              <li
                key={ch.id}
                className="flex items-center justify-between border border-foreground/10 rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${ch.isActive ? "bg-green-500" : "bg-foreground/30"}`}
                  />
                  <span className="text-sm font-mono">{ch.phoneNumber}</span>
                  <span className="text-xs text-foreground/50">{ch.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleChannel(ch.id)}
                    className="text-xs underline underline-offset-2 text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {ch.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleRemoveChannel(ch.id)}
                    className="text-xs underline underline-offset-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* session list */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sessions</h2>

        {!selectedWorkspace ? (
          <p className="text-sm text-foreground/50">
            Select a workspace to view sessions.
          </p>
        ) : filteredSessions.length === 0 ? (
          <p className="text-sm text-foreground/50">
            No sessions yet in this workspace.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredSessions.map((session) => {
              const graph = graphs[session.sessionId];
              return (
                <li
                  key={session.sessionId}
                  className="border border-foreground/10 rounded-lg p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">{session.goalText}</p>
                    <p className="text-xs text-foreground/50">
                      Status: {session.status} &middot; Started{" "}
                      {new Date(session.startedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* seed graph preview */}
                  {graph && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-foreground/60">
                        Task Graph ({graph.nodes.length} tasks,{" "}
                        {graph.edges.length} edges)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {graph.nodes.map((node) => (
                          <span
                            key={node.taskKey}
                            className="text-xs bg-foreground/5 border border-foreground/10 rounded px-2 py-1"
                          >
                            {node.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Link
                      href={`/sessions/${session.sessionId}`}
                      className="text-sm font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      Open dashboard
                    </Link>
                    <Link
                      href={`/sessions/${session.sessionId}/replay`}
                      className="text-sm text-foreground/60 underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      Replay
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
