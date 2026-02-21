"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ConvexErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const message = this.state.error?.message ?? "";
      const isNotDeployed =
        message.includes("Could not find public function") ||
        message.includes("npx convex dev") ||
        message.includes("npx convex deploy");

      return (
        <div className="border border-foreground/10 rounded-lg p-6 flex flex-col gap-3 bg-foreground/[0.02]">
          <h3 className="text-sm font-semibold text-foreground/80">
            {isNotDeployed
              ? "Convex Backend Not Deployed"
              : "Connection Error"}
          </h3>
          {isNotDeployed ? (
            <div className="flex flex-col gap-2 text-sm text-foreground/60">
              <p>
                The Convex functions have not been deployed yet. Run the
                following command locally to push the schema and functions:
              </p>
              <code className="bg-foreground/5 border border-foreground/10 rounded px-3 py-2 text-xs font-mono block">
                npx convex deploy
              </code>
              <p>
                Or for development with live sync:
              </p>
              <code className="bg-foreground/5 border border-foreground/10 rounded px-3 py-2 text-xs font-mono block">
                npx convex dev
              </code>
            </div>
          ) : (
            <p className="text-sm text-foreground/60">{message}</p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
