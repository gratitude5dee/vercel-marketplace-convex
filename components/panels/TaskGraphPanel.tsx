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

const statusColor: Record<string, string> = {
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
  const maxRows = Math.max(1, ...Array.from(nodesByLevel.values()).map((nodes) => nodes.length));
  const width = 220 * (maxLevel + 1);
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
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">Task Graph</h3>
      <p className="text-xs text-foreground/50">
        Priority-aware DAG with realtime status and assignment controls.
      </p>

      <div className="overflow-auto border border-foreground/10 rounded-lg">
        <svg width={width} height={height} className="block">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#9ca3af" />
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
                key={`${edge.fromTaskKey}-${edge.toTaskKey}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#9ca3af"
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            );
          })}

          {tasks.map((task) => {
            const pos = positionByTaskKey.get(task.taskKey);
            if (!pos) {
              return null;
            }

            return (
              <g key={task.taskKey}>
                <circle cx={pos.x} cy={pos.y} r={28} fill={statusColor[task.status] ?? "#9ca3af"} opacity={0.85} />
                <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
                  {task.label}
                </text>
                <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill="white" fontSize={8} opacity={0.8}>
                  {task.taskKey}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div key={task.taskKey} className="flex items-center gap-3 text-sm border border-foreground/10 rounded-md px-3 py-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor[task.status] }} />
            <span className="font-medium flex-1">
              {task.label} ({task.taskKey})
            </span>
            <span className="text-xs text-foreground/50">Priority {task.priority}</span>
            <select
              className="text-xs border border-foreground/20 rounded px-1 py-0.5 bg-background"
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
              className="text-xs border border-foreground/20 rounded px-1 py-0.5 bg-background"
              value={task.assigneeUserId ?? ""}
              onChange={(event) => {
                if (!event.target.value) {
                  return;
                }
                onAssign(task.taskKey, event.target.value);
              }}
            >
              <option value="">Assign...</option>
              {personas.map((persona) => (
                <option key={persona.userId} value={persona.userId}>
                  {persona.displayName ?? persona.userId}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
