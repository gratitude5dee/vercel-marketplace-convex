"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function SessionReplayPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = String(params.sessionId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Replay</h1>
          <p className="text-sm text-foreground/60 font-mono">{sessionId}</p>
        </div>
        <Link
          href={`/sessions/${sessionId}`}
          className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Back to dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-6 flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Recordings</h2>
          <p className="text-sm text-foreground/60">
            No recordings available. Recordings appear after Vapi calls are completed.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Manager Decision Log</h2>
          <p className="text-sm text-foreground/60">
            No action log entries yet. The manager agent logs decisions during active sessions.
          </p>
        </section>
      </main>
    </div>
  );
}
