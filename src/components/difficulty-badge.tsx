import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

// A luminance ladder, not three hues. Easy sits back as an outline, Medium
// takes a low fill, Hard inverts to solid ink — so difficulty climbs toward
// the eye. Everything derives from the foreground token, which means both
// themes are covered without a single dark: variant.
const STYLES: Record<Difficulty, string> = {
  Easy: "bg-transparent font-medium text-muted-foreground ring-border",
  Medium: "bg-foreground/[0.09] font-semibold text-foreground/85 ring-foreground/15",
  Hard: "bg-foreground font-bold text-background ring-transparent",
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
