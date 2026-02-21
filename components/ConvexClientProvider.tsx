"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";

// The Convex integration may provide a .convex.site URL (for HTTP Actions),
// but the ConvexReactClient needs .convex.cloud for the real-time WebSocket.
// Automatically convert .convex.site -> .convex.cloud so queries/mutations work.
const deploymentUrl = rawUrl.replace(/\.convex\.site\/?$/, ".convex.cloud");

// Gracefully handle missing env var so the page still renders
const convex = deploymentUrl
  ? new ConvexReactClient(deploymentUrl)
  : null;

function MissingConvexUrl({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md flex flex-col gap-4 text-center">
        <h1 className="text-xl font-bold">Convex Not Connected</h1>
        <p className="text-sm text-foreground/60">
          Set the <code className="bg-foreground/10 px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_CONVEX_URL</code> environment variable to your Convex deployment URL (ending in .convex.cloud or .convex.site).
        </p>
        <p className="text-sm text-foreground/60">
          Add it in the Vars section of the sidebar, then refresh.
        </p>
      </div>
    </div>
  );
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!convex) {
    return <MissingConvexUrl>{children}</MissingConvexUrl>;
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
