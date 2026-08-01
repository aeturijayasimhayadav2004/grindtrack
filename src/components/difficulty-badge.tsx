import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

// Hue carries the meaning again, but the weight ladder from the monochrome
// pass stays: 500 for Easy through 700 for Hard. That redundancy is what keeps
// the column readable in greyscale and under colour vision deficiency, where
// the original green/amber/red alone failed.
const STYLES: Record<Difficulty, string> = {
  Easy: "bg-emerald-500/12 font-medium text-emerald-700 ring-emerald-600/25 dark:text-emerald-300 dark:ring-emerald-400/25",
  Medium:
    "bg-amber-500/14 font-semibold text-amber-700 ring-amber-600/25 dark:text-amber-300 dark:ring-amber-400/25",
  Hard: "bg-rose-500/14 font-bold text-rose-700 ring-rose-600/25 dark:text-rose-300 dark:ring-rose-400/30",
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
