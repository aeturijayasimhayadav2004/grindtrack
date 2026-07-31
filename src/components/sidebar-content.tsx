"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CompanyMark } from "@/components/company-mark";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProgress } from "@/hooks/useProgress";
import { companies, getCompanyQuestions } from "@/lib/data";
import { cn } from "@/lib/utils";

export function SidebarContent({
  selectedSlug,
  onSelect,
}: {
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const { getAllProgress } = useProgress();
  const progressMap = getAllProgress();

  const companyProgress = useMemo(() => {
    const result = new Map<string, { completed: number; total: number }>();
    for (const c of companies) {
      const qs = getCompanyQuestions(c.slug);
      let completed = 0;
      for (const q of qs) {
        if (progressMap[q.id]?.status === "completed") completed++;
      }
      result.set(c.slug, { completed, total: qs.length });
    }
    return result;
  }, [progressMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  // Rollup reflects whatever is currently listed, so it doubles as feedback
  // that the filter actually did something.
  const rollup = useMemo(() => {
    let completed = 0;
    let total = 0;
    for (const c of filtered) {
      const p = companyProgress.get(c.slug);
      completed += p?.completed ?? 0;
      total += p?.total ?? c.questionCount;
    }
    return { completed, total };
  }, [filtered, companyProgress]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
      <div className="shrink-0 border-b border-sidebar-border px-3 pb-3 pt-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="label-micro">Companies</span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {filtered.length === companies.length
              ? companies.length
              : `${filtered.length}/${companies.length}`}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            aria-label="Filter companies"
            className="h-9 w-full rounded-sm border border-input bg-background/60 pl-8 pr-8 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear company filter"
              className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea
        type="always"
        className={cn(
          "min-h-0 flex-1",
          "[&_[data-slot=scroll-area-thumb]]:bg-muted-foreground/40",
          // Radix wraps viewport content in a display:table div, which sizes to
          // max-content and lets rows overflow the fixed-width sidebar. Force
          // block so flex-1 + truncate constrain to the container.
          "[&_[data-slot=scroll-area-viewport]>div]:!block",
        )}
      >
        <ul className="flex flex-col p-1.5" role="listbox" aria-label="Companies">
          {filtered.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-muted-foreground">
              No match for &ldquo;{query}&rdquo;
            </li>
          )}
          {filtered.map((c) => {
            const isSelected = c.slug === selectedSlug;
            const prog = companyProgress.get(c.slug);
            const done = prog?.completed ?? 0;
            const total = prog?.total ?? c.questionCount;
            const pct = total > 0 ? (done / total) * 100 : 0;
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(c.slug)}
                  className={cn(
                    "group relative flex w-full items-center gap-2 rounded-lg py-1.5 pl-2.5 pr-2 text-left text-sm outline-none transition-colors",
                    "before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring/40",
                    isSelected
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:bg-primary"
                      : "before:bg-transparent hover:bg-sidebar-accent/50 hover:before:bg-border",
                  )}
                >
                  <CompanyMark
                    slug={c.slug}
                    name={c.name}
                    className={cn(
                      "transition-[filter,transform] duration-200",
                      isSelected
                        ? "scale-105"
                        : "saturate-[0.85] group-hover:scale-105 group-hover:saturate-100",
                    )}
                  />

                  <span className="min-w-0 flex-1 truncate">{c.name}</span>

                  <span
                    className="h-[3px] w-7 shrink-0 overflow-hidden rounded-full bg-foreground/10"
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "block h-full rounded-full transition-[width] duration-500 ease-out",
                        done > 0 ? "bg-primary" : "bg-transparent",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </span>

                  <span
                    className={cn(
                      "w-10 shrink-0 text-right font-mono text-[10px] tabular-nums transition-colors",
                      done > 0 ? "text-primary" : "text-muted-foreground/70",
                    )}
                  >
                    {done}
                    <span className="text-muted-foreground/50">/{total}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      <div className="shrink-0 border-t border-sidebar-border px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="label-micro">Solved</span>
          <span className="font-mono text-[11px] tabular-nums">
            <span className={rollup.completed > 0 ? "text-primary" : "text-muted-foreground"}>
              {rollup.completed.toLocaleString()}
            </span>
            <span className="text-muted-foreground/60">
              {" / "}
              {rollup.total.toLocaleString()}
            </span>
          </span>
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{
              width: `${rollup.total > 0 ? (rollup.completed / rollup.total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
