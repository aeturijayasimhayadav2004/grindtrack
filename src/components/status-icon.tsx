"use client";

import { Circle, CircleCheckBig, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/lib/types";

const LABELS: Record<ProgressStatus, string> = {
  "not-started": "Not started",
  attempted: "Attempted",
  completed: "Completed",
};

export function statusLabel(status: ProgressStatus): string {
  return LABELS[status];
}

export function StatusIcon({
  status,
  onClick,
  className,
  celebrate,
}: {
  status: ProgressStatus;
  onClick?: () => void;
  className?: string;
  celebrate?: boolean;
}) {
  const Icon =
    status === "completed" ? CircleCheckBig : status === "attempted" ? CircleDashed : Circle;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Status: ${LABELS[status]}. Click to change.`}
      title={LABELS[status]}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Icon
        className={cn(
          "size-4 transition-colors duration-200",
          // Idle circles stay very quiet — with thousands of rows a bright
          // "empty" state turns the whole column into visual noise.
          status === "not-started" && "text-muted-foreground/35",
          status === "attempted" && "text-amber-500 dark:text-amber-400",
          status === "completed" && "text-emerald-600 dark:text-emerald-400",
          celebrate && "animate-status-pop",
        )}
        strokeWidth={2.25}
      />
    </button>
  );
}
