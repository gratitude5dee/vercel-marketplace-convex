"use client";

export function PersonasPanel({ personas }: { personas: any[] }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Participant Personas</h2>
      <div className="mt-3 space-y-2">
        {personas.length === 0 ? (
          <p className="text-sm text-slate-500">No participant personas recorded yet.</p>
        ) : (
          personas.map((persona) => (
            <div key={persona.personaId} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <p className="font-medium text-slate-900">{persona.displayName ?? persona.userId}</p>
              <p className="text-xs text-slate-500 mt-1">Style: {persona.style}</p>
              <p className="text-xs text-slate-500">Completeness: {Math.round(persona.profileCompleteness * 100)}%</p>
              <p className="text-xs text-slate-500 mt-1">
                Expertise: {persona.information.domainExpertise?.join(", ") || "Not set"}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
