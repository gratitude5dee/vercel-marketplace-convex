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
    <section className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Transcript</h2>
      <p className="text-sm text-slate-600 mt-1">Final transcript chunks stream here in realtime.</p>

      <div className="mt-4 space-y-2 max-h-[420px] overflow-auto pr-1">
        {results.map((chunk: any) => (
          <div key={chunk._id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
            <div className="text-xs text-slate-500 flex justify-between">
              <span>{chunk.role}</span>
              <span>#{chunk.sequence}</span>
            </div>
            <p className="text-sm text-slate-800 mt-1">{chunk.text}</p>
          </div>
        ))}
      </div>

      {status === "CanLoadMore" && (
        <button
          className="mt-3 text-sm px-3 py-2 rounded border border-slate-300 hover:bg-slate-50"
          onClick={() => loadMore(20)}
        >
          Load more
        </button>
      )}
    </section>
  );
}
