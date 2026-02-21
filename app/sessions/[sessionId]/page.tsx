"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TaskGraphPanel } from "@/components/panels/TaskGraphPanel";

// ---------------------------------------------------------------------------
// Session dashboard page.
// When the Convex backend is deployed, this page will use real-time queries.
// Until then it renders a placeholder showing the session ID.
// ---------------------------------------------------------------------------

interface WorkerCall {
  id: string;
  taskKey: string;
  participantName: string;
  status: "pending" | "ringing" | "active" | "completed" | "failed";
  startedAt: number;
  endedAt?: number;
}

const demoWorkerCalls: WorkerCall[] = [];

const demoTasks = [
  { _id: "t1", taskKey: "goal-brief", label: "Confirm Goal Brief", description: "Validate objective and decision boundaries.", status: "ready" as const, priority: 1, assigneeUserId: undefined },
  { _id: "t2", taskKey: "dependency-map", label: "Map Dependencies", description: "Capture sequencing and blockers.", status: "pending" as const, priority: 1, assigneeUserId: undefined },
  { _id: "t3", taskKey: "assignment", label: "Assign Owners", description: "Assign each critical-path task to an owner.", status: "pending" as const, priority: 2, assigneeUserId: undefined },
  { _id: "t4", taskKey: "alignment-review", label: "Run Alignment Review", description: "Confirm plan against constitution and stakeholder preferences.", status: "pending" as const, priority: 2, assigneeUserId: undefined },
];

const demoDependencies = [
  { _id: "e1", fromTaskKey: "goal-brief", toTaskKey: "dependency-map" },
  { _id: "e2", fromTaskKey: "dependency-map", toTaskKey: "assignment" },
  { _id: "e3", fromTaskKey: "assignment", toTaskKey: "alignment-review" },
];

export default function SessionDashboardPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = String(params.sessionId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-foreground/50 font-mono">
            Session: {sessionId}
          </p>
          <h1 className="text-lg font-bold">Session Dashboard</h1>
        </div>
        <Link
          href="/"
          className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Back
        </Link>
      </header>

      <div className="px-6 py-2 text-xs text-foreground/50 border-b border-foreground/10">
        {"Status: active \u00B7 Timestep 0 \u00B7 Tasks "}{demoTasks.length}
      </div>

      <main className="p-6 flex flex-col gap-6">
        {/* Task Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskGraphPanel
            tasks={demoTasks}
            dependencies={demoDependencies}
            personas={[]}
            onAssign={() => {}}
            onStatusChange={() => {}}
          />

          {/* Transcript placeholder */}
          <section className="border border-foreground/10 rounded-lg p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Live Transcript</h2>
            <p className="text-xs text-foreground/50">
              No transcript entries yet. Start a Vapi call to populate.
            </p>
          </section>
        </div>

        {/* Metrics placeholder */}
        <section className="border border-foreground/10 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Consensus" value="--" />
            <MetricCard label="Turn Balance" value="--" />
            <MetricCard label="Human Invocations" value="0" />
            <MetricCard label="Tasks Completed" value="0" />
          </div>
        </section>

        {/* Active Worker Calls */}
        <section className="border border-foreground/10 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Active Worker Calls</h2>
          {demoWorkerCalls.length === 0 ? (
            <p className="text-xs text-foreground/50">
              No active worker calls. When the manager assigns a task to a
              participant, a parallel Vapi call appears here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {demoWorkerCalls.map((call) => (
                <li
                  key={call.id}
                  className="flex items-center justify-between border border-foreground/10 rounded-md px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <WorkerStatusBadge status={call.status} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {call.participantName}
                      </span>
                      <span className="text-xs text-foreground/50 font-mono">
                        {call.taskKey}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-foreground/50">
                    {call.endedAt
                      ? `${((call.endedAt - call.startedAt) / 1000).toFixed(0)}s`
                      : `${((Date.now() - call.startedAt) / 1000).toFixed(0)}s`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="border border-foreground/10 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2">Personas</h2>
            <p className="text-xs text-foreground/50">
              No personas registered. They appear when participants join via Vapi.
            </p>
          </section>

          <section className="border border-foreground/10 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2">Manager Actions</h2>
            <p className="text-xs text-foreground/50">No actions recorded yet.</p>
          </section>

          <section className="border border-foreground/10 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2">Media</h2>
            <p className="text-xs text-foreground/50">No recordings available.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

const workerStatusColors: Record<string, string> = {
  pending: "bg-foreground/30 text-foreground/70",
  ringing: "bg-yellow-500/20 text-yellow-400",
  active: "bg-green-500/20 text-green-400",
  completed: "bg-foreground/10 text-foreground/50",
  failed: "bg-red-500/20 text-red-400",
};

function WorkerStatusBadge({ status }: { status: string }) {
  const cls = workerStatusColors[status] ?? "bg-foreground/10 text-foreground/50";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
