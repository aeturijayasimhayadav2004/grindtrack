"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Progress lives in Supabase, so nothing is lost by
 * resetting — this just turns a blank screen into a way back.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div role="alert" className="flex max-w-sm flex-col items-center gap-3 text-center">
        <TriangleAlert className="size-6 text-amber-500" />
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="text-sm text-muted-foreground">
          Your saved progress is safe. Try again, or reload the page if it keeps happening.
        </p>
        <div className="mt-1 flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.assign("/")}>
            Go home
          </Button>
        </div>
      </div>
    </main>
  );
}
