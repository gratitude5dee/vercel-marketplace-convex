"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const typedApi = api as any;

export function TranscriptPanel({ sessionId }: { sessionId: string }) {
  const { results, status, loadMore } = usePaginatedQuery(
    typedApi.transcripts.listPaginated,
    { sessionId },
    { initialNumItems: 20 },
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">Transcript</h3>
      <p className="text-xs text-foreground/50">Final transcript chunks stream here in realtime.</p>

      <div className="border border-foreground/10 rounded-lg p-4 max-h-96 overflow-auto flex flex-col gap-2">
        {results.map((chunk: any) => (
          <div key={chunk._id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground/70">{chunk.role}</span>
              <span className="text-xs text-foreground/40">#{chunk.sequence}</span>
            </div>
            <p className="text-sm">{chunk.text}</p>
          </div>
        ))}
      </div>

      {status === "CanLoadMore" && (
        <button
          className="text-sm underline underline-offset-2 hover:opacity-80 self-start"
          onClick={() => loadMore(20)}
        >
          Load more
        </button>
      )}
    </div>
  );
}
