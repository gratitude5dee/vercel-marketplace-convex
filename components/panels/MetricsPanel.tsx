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
    <section className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Metrics</h2>
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
