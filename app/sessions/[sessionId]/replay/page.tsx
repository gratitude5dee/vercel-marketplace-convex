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
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-600">Loading replay…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Replay</p>
              <h1 className="text-xl font-semibold">{session?.goalText ?? "Session"}</h1>
            </div>
            <Link className="text-blue-700 underline text-sm" href={`/sessions/${sessionId}`}>
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Recordings</h2>
          <div className="mt-3 space-y-2">
            {media.length === 0 ? (
              <p className="text-sm text-slate-500">No recordings available.</p>
            ) : (
              media.map((asset: any) => (
                <div key={asset.mediaId} className="rounded border border-slate-200 p-3 bg-slate-50">
                  <p className="text-sm text-slate-700">Call ID: {asset.callId}</p>
                  <div className="mt-1 flex gap-3">
                    {asset.url ? (
                      <a className="text-blue-700 underline" href={asset.url} target="_blank" rel="noreferrer">
                        Open recording
                      </a>
                    ) : null}
                    {asset.transcriptSnapshotUrl ? (
                      <a
                        className="text-blue-700 underline"
                        href={asset.transcriptSnapshotUrl}
                        target="_blank"
                        rel="noreferrer"
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

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Manager Decision Log</h2>
          <div className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">
            {actions.length === 0 ? (
              <p className="text-sm text-slate-500">No action log entries.</p>
            ) : (
              actions.map((action: any) => (
                <div key={action._id} className="rounded border border-slate-200 p-3 bg-slate-50">
                  <p className="text-xs text-slate-500">
                    {new Date(action.createdAt).toLocaleString()} · {action.actionType} · {action.trigger}
                  </p>
                  {action.taskKey ? <p className="text-xs mt-1">Task: {action.taskKey}</p> : null}
                  {action.message ? <p className="text-sm mt-1">{action.message}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
