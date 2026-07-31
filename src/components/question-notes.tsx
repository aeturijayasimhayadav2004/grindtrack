"use client";

import { NotebookPen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useProgress } from "@/hooks/useProgress";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 800;

export function QuestionNotes({ questionId, title }: { questionId: string; title: string }) {
  const { getNotes, setNotes } = useProgress();
  const saved = getNotes(questionId);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(saved);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest values for the debounce/unmount paths, which run outside render.
  const latest = useRef({ draft, saved, questionId, setNotes });
  latest.current = { draft, saved, questionId, setNotes };

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const current = latest.current;
    if (current.draft !== current.saved) {
      current.setNotes(current.questionId, current.draft);
    }
  }, []);

  // Rows unmount when filters change — don't lose an in-flight edit.
  useEffect(() => () => flush(), [flush]);

  function handleChange(value: string) {
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }

  function handleOpenChange(next: boolean) {
    if (next) setDraft(saved);
    else flush();
    setOpen(next);
  }

  const hasNotes = saved.trim() !== "";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={hasNotes ? `Edit notes for ${title}` : `Add notes for ${title}`}
          className={cn(
            "relative inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hasNotes && "text-primary",
          )}
        >
          <NotebookPen className="size-4" />
          {hasNotes && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="mb-2 truncate text-xs font-medium text-muted-foreground">{title}</p>
        <Textarea
          autoFocus
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={flush}
          placeholder="Approach, edge cases, what tripped you up…"
          className="min-h-28 resize-y text-sm"
        />
        <p className="mt-2 text-xs text-muted-foreground">Saves automatically.</p>
      </PopoverContent>
    </Popover>
  );
}
