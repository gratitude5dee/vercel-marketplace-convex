"use client";

export function ManagerActionTimelinePanel({ actions }: { actions: any[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">Manager Action Timeline</h3>
      <div className="flex flex-col gap-2 max-h-72 overflow-auto">
        {actions.length === 0 ? (
          <p className="text-sm text-foreground/60">No manager actions logged yet.</p>
        ) : (
          actions.map((action) => (
            <div key={action._id} className="border-l-2 border-foreground/20 pl-3 py-1">
              <p className="text-xs text-foreground/50">
                {new Date(action.createdAt).toLocaleTimeString()}
                {" \u00B7 "}{action.actionType}{" \u00B7 "}{action.trigger}
              </p>
              {action.taskKey ? <p className="text-sm">Task: {action.taskKey}</p> : null}
              {action.message ? <p className="text-sm text-foreground/70">{action.message}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
