"use client";

export function MediaPanel({ media }: { media: any[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">Media Assets</h3>
      <div className="flex flex-col gap-3">
        {media.length === 0 ? (
          <p className="text-sm text-foreground/60">No recordings yet.</p>
        ) : (
          media.map((asset) => (
            <div key={asset.mediaId} className="border border-foreground/10 rounded-lg p-3 flex flex-col gap-1">
              <p className="text-sm font-medium">Call {asset.callId}</p>
              <p className="text-xs text-foreground/50">{asset.contentType}</p>
              <div className="flex gap-3">
                {asset.url ? (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline underline-offset-2 hover:opacity-80"
                  >
                    Open recording
                  </a>
                ) : null}
                {asset.transcriptSnapshotUrl ? (
                  <a
                    href={asset.transcriptSnapshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground/60 underline underline-offset-2 hover:opacity-80"
                  >
                    Transcript snapshot
                  </a>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
