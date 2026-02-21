"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TaskGraphPanel } from "@/components/panels/TaskGraphPanel";

// ---------------------------------------------------------------------------
// Session dashboard page.
// When the Convex backend is deployed, this page will use real-time queries.
// Until then it renders a placeholder showing the session ID.
// ---------------------------------------------------------------------------

const demoTasks = [
  { taskKey: "goal-brief", label: "Confirm Goal Brief", description: "Validate objective and decision boundaries.", status: "ready" as const, priority: 1, assigneeUserId: undefined },
  { taskKey: "dependency-map", label: "Map Dependencies", description: "Capture sequencing and blockers.", status: "pending" as const, priority: 1, assigneeUserId: undefined },
  { taskKey: "assignment", label: "Assign Owners", description: "Assign each critical-path task to an owner.", status: "pending" as const, priority: 2, assigneeUserId: undefined },
  { taskKey: "alignment-review", label: "Run Alignment Review", description: "Confirm plan against constitution and stakeholder preferences.", status: "pending" as const, priority: 2, assigneeUserId: undefined },
];

const demoDependencies = [
  { fromTaskKey: "goal-brief", toTaskKey: "dependency-map" },
  { fromTaskKey: "dependency-map", toTaskKey: "assignment" },
  { fromTaskKey: "assignment", toTaskKey: "alignment-review" },
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
