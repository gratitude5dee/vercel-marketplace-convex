"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const typedApi = api as any;

export default function SessionReplayPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = String(params.sessionId);

  const session = useQuery(typedApi.sessions.getById, { sessionId });
  const media = useQuery(typedApi.media.listBySession, { sessionId }) ?? [];
  const actions = useQuery(typedApi.managerActions.listRecent, { sessionId, limit: 200 }) ?? [];

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-foreground/60">Loading replay...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Replay</h1>
          <p className="text-sm text-foreground/60">{session?.goalText ?? "Session"}</p>
        </div>
        <Link
          href={`/sessions/${sessionId}`}
          className="text-sm underline underline-offset-2 hover:opacity-80"
        >
          Back to dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-6 flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Recordings</h2>
          <div className="flex flex-col gap-3">
            {media.length === 0 ? (
              <p className="text-sm text-foreground/60">No recordings available.</p>
            ) : (
              media.map((asset: any) => (
                <div
                  key={asset.mediaId}
                  className="border border-foreground/10 rounded-lg p-4 flex flex-col gap-2"
                >
                  <p className="text-sm font-medium">Call ID: {asset.callId}</p>
                  <div className="flex gap-3">
                    {asset.url ? (
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline underline-offset-2 hover:opacity-80"
                      >
                        Open recording
                      </a>
                    ) : null}
                    {asset.transcriptSnapshotUrl ? (
                      <a
                        href={asset.transcriptSnapshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-foreground/60 underline underline-offset-2 hover:opacity-80"
                      >
                        Transcript snapshot
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Manager Decision Log</h2>
          <div className="flex flex-col gap-2">
            {actions.length === 0 ? (
              <p className="text-sm text-foreground/60">No action log entries.</p>
            ) : (
              actions.map((action: any) => (
                <div key={action._id} className="border-l-2 border-foreground/20 pl-3 py-1">
                  <p className="text-xs text-foreground/50">
                    {new Date(action.createdAt).toLocaleString()}
                    {" \u00B7 "}{action.actionType}{" \u00B7 "}{action.trigger}
                  </p>
                  {action.taskKey ? <p className="text-sm">Task: {action.taskKey}</p> : null}
                  {action.message ? <p className="text-sm text-foreground/70">{action.message}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
