"use client";

export function ManagerActionTimelinePanel({ actions }: { actions: any[] }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Manager Action Timeline</h2>
      <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">No manager actions logged yet.</p>
        ) : (
          actions.map((action) => (
            <div key={action._id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="text-xs text-slate-500">
                {new Date(action.createdAt).toLocaleTimeString()} · {action.actionType} · {action.trigger}
              </p>
              {action.taskKey ? <p className="text-xs text-slate-600">Task: {action.taskKey}</p> : null}
              {action.message ? <p className="text-sm text-slate-800 mt-1">{action.message}</p> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
