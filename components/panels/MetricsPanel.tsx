"use client";

export function MetricsPanel({ metrics }: { metrics: any }) {
  const cards = [
    { label: "Goal Achievement", value: `${Math.round((metrics?.goalAchievement ?? 0) * 100)}%` },
    { label: "Constraint Adherence", value: `${Math.round((metrics?.constraintAdherence ?? 0) * 100)}%` },
    { label: "Alignment Score", value: `${Math.round((metrics?.alignmentScore ?? 0) * 100)}%` },
    { label: "Stakeholder Mgmt", value: `${Math.round((metrics?.stakeholderMgmt ?? 0) * 100)}%` },
    { label: "Runtime Hours", value: `${metrics?.runtimeHours ?? 0}` },
    { label: "Tasks Complete", value: `${metrics?.completedTasks ?? 0}/${metrics?.totalTasks ?? 0}` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">Metrics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="border border-foreground/10 rounded-lg p-3 text-center">
            <p className="text-xs text-foreground/50">{card.label}</p>
            <p className="text-lg font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
