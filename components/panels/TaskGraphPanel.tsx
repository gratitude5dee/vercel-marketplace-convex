"use client";

import { useMemo } from "react";

type Task = {
  _id: string;
  taskKey: string;
  label: string;
  status: "pending" | "ready" | "in_progress" | "completed" | "failed";
  assigneeUserId?: string;
  priority: number;
};

type Edge = {
  _id: string;
  fromTaskKey: string;
  toTaskKey: string;
};

type Persona = {
  userId: string;
  displayName?: string;
};

const statusColor: Record<Task["status"], string> = {
  pending: "#9ca3af",
  ready: "#3b82f6",
  in_progress: "#f59e0b",
  completed: "#10b981",
  failed: "#ef4444",
};

function buildLevels(tasks: Task[], edges: Edge[]) {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  tasks.forEach((task) => {
    incoming.set(task.taskKey, 0);
    outgoing.set(task.taskKey, []);
  });

  edges.forEach((edge) => {
    incoming.set(edge.toTaskKey, (incoming.get(edge.toTaskKey) ?? 0) + 1);
    outgoing.set(edge.fromTaskKey, [...(outgoing.get(edge.fromTaskKey) ?? []), edge.toTaskKey]);
  });

  const queue: string[] = tasks
    .filter((task) => (incoming.get(task.taskKey) ?? 0) === 0)
    .sort((a, b) => a.priority - b.priority)
    .map((task) => task.taskKey);
  const level = new Map<string, number>();

  while (queue.length > 0) {
    const key = queue.shift()!;
    const currentLevel = level.get(key) ?? 0;

    for (const nextKey of outgoing.get(key) ?? []) {
      incoming.set(nextKey, (incoming.get(nextKey) ?? 0) - 1);
      if ((incoming.get(nextKey) ?? 0) <= 0) {
        level.set(nextKey, Math.max(level.get(nextKey) ?? 0, currentLevel + 1));
        queue.push(nextKey);
      }
    }
  }

  return level;
}

export function TaskGraphPanel({
  tasks,
  dependencies,
  personas,
  onAssign,
  onStatusChange,
}: {
  tasks: Task[];
  dependencies: Edge[];
  personas: Persona[];
  onAssign: (taskKey: string, assigneeUserId: string) => void;
  onStatusChange: (taskKey: string, status: Task["status"]) => void;
}) {
  const levelByTaskKey = useMemo(() => buildLevels(tasks, dependencies), [tasks, dependencies]);
  const nodesByLevel = useMemo(() => {
    const result = new Map<number, Task[]>();
    for (const task of tasks) {
      const level = levelByTaskKey.get(task.taskKey) ?? 0;
      const existing = result.get(level) ?? [];
      existing.push(task);
      result.set(level, existing.sort((a, b) => a.priority - b.priority));
    }
    return result;
  }, [tasks, levelByTaskKey]);

  const maxLevel = Math.max(0, ...Array.from(nodesByLevel.keys()));
  const width = 220 * (maxLevel + 1);
  const maxRows = Math.max(1, ...Array.from(nodesByLevel.values()).map((nodes) => nodes.length));
  const height = 140 * maxRows;

  const positionByTaskKey = new Map<string, { x: number; y: number }>();
  for (const [level, nodes] of nodesByLevel.entries()) {
    nodes.forEach((node, index) => {
      positionByTaskKey.set(node.taskKey, {
        x: 110 + level * 220,
        y: 70 + index * 140,
      });
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Task Graph</h2>
      <p className="text-sm text-slate-600 mt-1">
        Priority-aware DAG with realtime status and assignment controls.
      </p>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px] w-full h-[360px]">
          <defs>
            <marker id="task-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
            </marker>
          </defs>

          {dependencies.map((edge) => {
            const from = positionByTaskKey.get(edge.fromTaskKey);
            const to = positionByTaskKey.get(edge.toTaskKey);
            if (!from || !to) {
              return null;
            }

            return (
              <line
                key={edge._id}
                x1={from.x + 30}
                y1={from.y}
                x2={to.x - 30}
                y2={to.y}
                stroke="#94a3b8"
                strokeWidth={2}
                markerEnd="url(#task-arrow)"
              />
            );
          })}

          {tasks.map((task) => {
            const pos = positionByTaskKey.get(task.taskKey);
            if (!pos) {
              return null;
            }

            return (
              <g key={task._id} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r={26} fill={statusColor[task.status]} />
                <text y={50} textAnchor="middle" fill="#0f172a" fontSize={12}>
                  {task.label}
                </text>
                <text y={66} textAnchor="middle" fill="#64748b" fontSize={10}>
                  {task.taskKey}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((task) => (
          <div key={task._id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
            <p className="font-medium text-slate-900">
              {task.label} <span className="text-slate-500">({task.taskKey})</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Priority {task.priority}</p>
            <div className="mt-2 flex gap-2 items-center">
              <select
                className="text-xs border border-slate-300 rounded px-2 py-1"
                value={task.status}
                onChange={(event) =>
                  onStatusChange(task.taskKey, event.target.value as Task["status"])
                }
              >
                <option value="pending">pending</option>
                <option value="ready">ready</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
              </select>
              <select
                className="text-xs border border-slate-300 rounded px-2 py-1"
                value={task.assigneeUserId ?? ""}
                onChange={(event) => {
                  if (!event.target.value) {
                    return;
                  }
                  onAssign(task.taskKey, event.target.value);
                }}
              >
                <option value="">Assign…</option>
                {personas.map((persona) => (
                  <option key={persona.userId} value={persona.userId}>
                    {persona.displayName ?? persona.userId}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
