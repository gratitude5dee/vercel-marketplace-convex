"use client";

export function PersonasPanel({ personas }: { personas: any[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">Participant Personas</h3>
      <div className="flex flex-col gap-3">
        {personas.length === 0 ? (
          <p className="text-sm text-foreground/60">No participant personas recorded yet.</p>
        ) : (
          personas.map((persona) => (
            <div key={persona.personaId ?? persona.userId} className="border border-foreground/10 rounded-lg p-3 flex flex-col gap-1">
              <p className="text-sm font-medium">{persona.displayName ?? persona.userId}</p>
              <p className="text-xs text-foreground/50">Style: {persona.style}</p>
              <p className="text-xs text-foreground/50">Completeness: {Math.round(persona.profileCompleteness * 100)}%</p>
              <p className="text-xs text-foreground/40">
                Expertise: {persona.information.domainExpertise?.join(", ") || "Not set"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
