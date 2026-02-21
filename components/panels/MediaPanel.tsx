"use client";

export function MediaPanel({ media }: { media: any[] }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Media Assets</h2>
      <div className="mt-3 space-y-2">
        {media.length === 0 ? (
          <p className="text-sm text-slate-500">No recordings yet.</p>
        ) : (
          media.map((asset) => (
            <div key={asset.mediaId} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <p className="text-sm text-slate-900">Call {asset.callId}</p>
              <p className="text-xs text-slate-500">{asset.contentType}</p>
              <div className="mt-2 flex gap-3 text-sm">
                {asset.url ? (
                  <a className="text-blue-600 underline" href={asset.url} target="_blank" rel="noreferrer">
                    Open recording
                  </a>
                ) : null}
                {asset.transcriptSnapshotUrl ? (
                  <a
                    className="text-blue-600 underline"
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
  );
}
