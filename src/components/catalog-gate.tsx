"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/lib/data";

/**
 * Holds the app back until the question catalog has loaded, so every component
 * below can read question data synchronously. Shows a retry on failure instead
 * of rendering a tracker with no questions in it.
 */
export function CatalogGate({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();

  if (catalog.status === "ready") return <>{children}</>;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      {catalog.status === "loading" ? (
        <div role="status" className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-sm">Loading questions…</span>
        </div>
      ) : (
        <div role="alert" className="flex max-w-sm flex-col items-center gap-3 text-center">
          <TriangleAlert className="size-6 text-amber-500" />
          <p className="text-base font-semibold">Couldn&apos;t load the question list</p>
          <p className="text-sm text-muted-foreground">{catalog.message}</p>
          <Button variant="outline" size="sm" onClick={catalog.retry} className="mt-1">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </div>
      )}
    </main>
  );
}
