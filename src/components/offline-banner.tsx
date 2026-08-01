"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";

/**
 * Shown when the initial fetch or a write to Supabase failed. The app keeps
 * working from the in-memory cache — only persistence is degraded.
 */
export function OfflineBanner() {
  const { offline, loading, refresh } = useProgress();

  if (loading || !offline) return null;

  return (
    // Inverted rather than tinted: with no colour left in the system, the way
    // to make a degraded state unmissable is to flip the field.
    <div
      role="status"
      className="flex items-center gap-2 border-b border-border bg-foreground px-4 py-2 text-sm font-medium text-background"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>Offline — changes are not being saved.</span>
      <button
        type="button"
        onClick={refresh}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-background/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40"
      >
        <RefreshCw className="size-3.5" />
        Retry
      </button>
    </div>
  );
}
