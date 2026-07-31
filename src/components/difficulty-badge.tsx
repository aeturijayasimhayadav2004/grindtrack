import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

// Tint + inset ring rather than a flat pill: the ring keeps the tag legible
// against both the bone and ink backgrounds without raising the fill contrast.
const STYLES: Record<Difficulty, string> = {
  Easy: "bg-green-100 text-green-800 ring-green-700/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/25",
  Medium:
    "bg-amber-100 text-amber-800 ring-amber-700/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-400/25",
  Hard: "bg-red-100 text-red-800 ring-red-700/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-400/25",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase leading-[1.4] tracking-[0.08em] ring-1 ring-inset",
        STYLES[difficulty],
        className,
      )}
    >
      {difficulty}
    </span>
  );
}
