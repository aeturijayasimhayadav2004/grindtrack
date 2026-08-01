"use client";

import { ExternalLink, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyMark } from "@/components/company-mark";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { QuestionNotes } from "@/components/question-notes";
import { StatusIcon } from "@/components/status-icon";
import { useProgress } from "@/hooks/useProgress";
import { getCompany, getCompanyQuestions, TIMEFRAME_LABELS } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Difficulty, ProgressStatus, Question, TimeframeSlug } from "@/lib/types";

type SortKey = "frequency" | "difficulty" | "alphabetical" | "recent-complete";

const DIFFICULTY_ORDER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };
const ALL_DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const TIMEFRAME_OPTIONS: TimeframeSlug[] = [
  "allTime",
  "moreThan6Months",
  "6months",
  "3months",
  "30days",
];
const STATUS_OPTIONS: { value: "all" | ProgressStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not-started", label: "Not Started" },
  { value: "attempted", label: "Attempted" },
  { value: "completed", label: "Completed" },
];
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "frequency", label: "Frequency" },
  { value: "difficulty", label: "Difficulty" },
  { value: "alphabetical", label: "A–Z" },
  { value: "recent-complete", label: "Recently done" },
];

// Each toggle wears its own difficulty colour when active, so the filter state
// is readable at a glance instead of being three identical grey chips.
const DIFFICULTY_TOGGLE: Record<Difficulty, string> = {
  Easy: "bg-green-100 text-green-800 ring-green-700/25 dark:bg-green-900/35 dark:text-green-300 dark:ring-green-400/25",
  Medium:
    "bg-amber-100 text-amber-800 ring-amber-700/25 dark:bg-amber-900/35 dark:text-amber-300 dark:ring-amber-400/25",
  Hard: "bg-red-100 text-red-800 ring-red-700/25 dark:bg-red-900/35 dark:text-red-300 dark:ring-red-400/25",
};

const DEFAULT_DIFFICULTIES = ALL_DIFFICULTIES;
const DEFAULT_SORT: SortKey = "frequency";
// 10 ticks at 3px + 2px gap, minus the trailing gap.
const METER_WIDTH = 48;
const STAGGER_ROWS = 14;
const COLUMN_COUNT = 6;
// Rows rendered per batch. The big companies run past 2,000 questions, and every
// row carries a meter, two buttons and a link — mounting them all at once is the
// difference between an instant table and a locked-up tab on mobile.
const PAGE_SIZE = 60;
// Long enough for animate-status-pop to finish, short enough that it never
// lingers on a row the user has already moved past.
const POP_MS = 600;

export function QuestionTable({
  companySlug,
  highlightId,
}: {
  companySlug: string;
  highlightId?: string;
}) {
  const company = getCompany(companySlug);
  const base = getCompanyQuestions(companySlug);

  const [difficulties, setDifficulties] = useState<Difficulty[]>(DEFAULT_DIFFICULTIES);
  const [timeframe, setTimeframe] = useState<TimeframeSlug>("allTime");
  const [statusFilter, setStatusFilter] = useState<"all" | ProgressStatus>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [loading, setLoading] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);
  // The single row that just became "completed". Scoped to one id so the pop
  // fires on the transition instead of on every finished row at mount.
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { getAllProgress, cycleStatus } = useProgress();
  const progressMap = getAllProgress();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 220);
    return () => clearTimeout(t);
  }, []);

  // The upstream CSVs carry no topics column, so for most companies this is
  // empty on every row. Only spend a column on it when there is data.
  const hasTopics = useMemo(() => base.some((q) => q.topics.length > 0), [base]);

  const solvedCount = useMemo(
    () => base.reduce((n, q) => (progressMap[q.id]?.status === "completed" ? n + 1 : n), 0),
    [base, progressMap],
  );

  function frequencyFor(q: Question): number {
    if (timeframe === "allTime") return q.frequencyByTimeframe.allTime ?? q.frequency;
    return q.frequencyByTimeframe[timeframe] ?? q.frequency;
  }

  const filtered = useMemo(() => {
    let list = base;
    if (timeframe !== "allTime") {
      list = list.filter((q) => q.timeframes.includes(timeframe));
    }
    if (difficulties.length < ALL_DIFFICULTIES.length) {
      list = list.filter((q) => difficulties.includes(q.difficulty));
    }
    if (statusFilter !== "all") {
      list = list.filter((q) => (progressMap[q.id]?.status ?? "not-started") === statusFilter);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((q) => q.title.toLowerCase().includes(query));
    }
    return list;
  }, [base, timeframe, difficulties, statusFilter, search, progressMap]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case "frequency":
        copy.sort((a, b) => frequencyFor(b) - frequencyFor(a));
        break;
      case "difficulty":
        copy.sort(
          (a, b) =>
            DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
            frequencyFor(b) - frequencyFor(a),
        );
        break;
      case "alphabetical":
        copy.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "recent-complete":
        copy.sort((a, b) => {
          const ea = progressMap[a.id];
          const eb = progressMap[b.id];
          const ta = ea?.status === "completed" ? ea.updatedAt : -Infinity;
          const tb = eb?.status === "completed" ? eb.updatedAt : -Infinity;
          return tb - ta;
        });
        break;
    }
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, timeframe, progressMap]);

  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = visibleCount < sorted.length;

  useEffect(() => {
    if (!highlightId || loading) return;
    const row = rowRefs.current.get(highlightId);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(highlightId);
    const t = setTimeout(() => setFlashId(null), 1600);
    return () => clearTimeout(t);
    // Keyed on `visible`, not `sorted`: the row only exists once the batch
    // window has grown far enough to render it.
  }, [highlightId, visible, loading]);

  // Any change to the result set puts the user back at the top of it, so the
  // batch counter has to go back to the top too.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [companySlug, timeframe, difficulties, statusFilter, search, sort]);

  // Reveal the next batch when the sentinel scrolls into view. rootMargin loads
  // slightly ahead of the fold so the table rarely shows its own seam.
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => Math.min(n + PAGE_SIZE, sorted.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, sorted.length]);

  // A highlighted question can sit far past the first batch, so grow the window
  // until it exists before the scroll effect below goes looking for its row.
  useEffect(() => {
    if (!highlightId) return;
    const idx = sorted.findIndex((q) => q.id === highlightId);
    if (idx >= 0 && idx >= visibleCount) {
      setVisibleCount(Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE);
    }
  }, [highlightId, sorted, visibleCount]);

  // "/" jumps to the filter box — the one control this view is really built
  // around. Ignored while already typing so it stays literal in text fields.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleDifficulty(d: Difficulty) {
    setDifficulties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function resetFilters() {
    setDifficulties(DEFAULT_DIFFICULTIES);
    setTimeframe("allTime");
    setStatusFilter("all");
    setSearch("");
    // Sort is part of what "clear" means here: leaving it behind is the one
    // piece of state that would survive a reset the user thinks was total.
    setSort(DEFAULT_SORT);
  }

  function handleCycle(questionId: string) {
    const next = cycleStatus(questionId);
    if (next !== "completed") {
      setPoppedId((current) => (current === questionId ? null : current));
      return;
    }
    setPoppedId(questionId);
    window.setTimeout(() => {
      setPoppedId((current) => (current === questionId ? null : current));
    }, POP_MS);
  }

  const filtersActive =
    difficulties.length !== ALL_DIFFICULTIES.length ||
    timeframe !== "allTime" ||
    statusFilter !== "all" ||
    search.trim() !== "";

  const indexWidth = String(sorted.length).length;

  return (
    <div className="flex min-h-full flex-col">
      {/* Company masthead */}
      <div className="relative overflow-hidden px-4 pb-6 pt-6 sm:px-7 sm:pt-8">
        <div className="mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="relative flex items-center gap-4">
          <CompanyMark
            slug={companySlug}
            name={company?.name ?? companySlug}
            size="lg"
            className="shadow-lg shadow-black/10"
          />
          <div className="min-w-0">
            <span className="label-micro">Company</span>
            <h1 className="mt-1 text-balance font-display text-3xl font-extrabold leading-none tracking-[-0.03em] sm:text-[2.5rem]">
              {company?.name ?? companySlug}
            </h1>
          </div>
        </div>
        <div className="relative mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5">
            {base.length.toLocaleString()} questions
          </span>
          <span
            className={
              solvedCount > 0
                ? "rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary"
                : "rounded-full bg-foreground/[0.06] px-2 py-0.5"
            }
          >
            {solvedCount.toLocaleString()} solved
          </span>
          <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5">
            {TIMEFRAME_LABELS[timeframe]}
          </span>
        </div>
      </div>

      {/* Sticky control rail — hairlines, no card. */}
      <div className="sticky top-0 z-20 border-y border-border bg-background/85 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-7">
          <div className="flex items-center gap-1" role="group" aria-label="Filter by difficulty">
            {ALL_DIFFICULTIES.map((d) => {
              const on = difficulties.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDifficulty(d)}
                  className={cn(
                    "rounded-sm px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-ring",
                    on
                      ? DIFFICULTY_TOGGLE[d]
                      : "text-muted-foreground/70 ring-border hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />

          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframeSlug)}>
            <SelectTrigger
              size="sm"
              aria-label="Frequency window"
              className="h-8 w-[176px] gap-1.5 rounded-sm"
            >
              <span className="label-micro shrink-0">Window</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIMEFRAME_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Filter by status"
              className="h-8 w-[168px] gap-1.5 rounded-sm"
            >
              <span className="label-micro shrink-0">Status</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearch("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search titles…  /"
            aria-label="Search this company's questions"
            aria-keyshortcuts="/"
            className="h-8 min-w-[160px] flex-1 rounded-sm border border-input bg-background px-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25 sm:max-w-[260px] sm:text-sm"
          />

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              size="sm"
              aria-label="Sort questions"
              className="h-8 w-[188px] gap-1.5 rounded-sm sm:ml-auto"
            >
              <span className="label-micro shrink-0">Sort</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-1.5 sm:px-7">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Showing <span className="text-foreground">{sorted.length.toLocaleString()}</span> of{" "}
            <span className="text-foreground">{base.length.toLocaleString()}</span>
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-sm px-1.5 py-0.5 font-mono text-[11px] text-primary underline-offset-2 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              clear filters
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-16 sm:px-7">
        <Table className="border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <HeadCell className="w-10 pl-0 text-right">#</HeadCell>
              <HeadCell className="w-[76px]">Status</HeadCell>
              <HeadCell>Title</HeadCell>
              <HeadCell className="w-[92px]">Level</HeadCell>
              <HeadCell className="w-[150px]">Frequency</HeadCell>
              {hasTopics ? (
                <HeadCell className="w-48">Topics</HeadCell>
              ) : (
                <HeadCell className="w-[92px] pr-0 text-right">Acc.</HeadCell>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-0 hover:bg-transparent">
                  <BodyCell className="pl-0">
                    <Skeleton className="ml-auto h-3 w-4" />
                  </BodyCell>
                  <BodyCell>
                    <div className="flex items-center gap-1">
                      <Skeleton className="size-6 rounded-full" />
                      <Skeleton className="size-6 rounded-sm" />
                    </div>
                  </BodyCell>
                  <BodyCell>
                    <Skeleton className="h-3.5" style={{ width: `${45 + ((i * 37) % 40)}%` }} />
                  </BodyCell>
                  <BodyCell>
                    <Skeleton className="h-4 w-14 rounded-[3px]" />
                  </BodyCell>
                  <BodyCell>
                    <Skeleton className="h-3 w-24" />
                  </BodyCell>
                  <BodyCell className="pr-0">
                    <Skeleton className="ml-auto h-3 w-10" />
                  </BodyCell>
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="px-0 py-20">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <span className="grid size-11 place-items-center rounded-sm border border-dashed border-border text-muted-foreground">
                      <SearchX className="size-5" />
                    </span>
                    <p className="font-display text-lg font-semibold tracking-tight">
                      Nothing matches
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {difficulties.length === 0
                        ? "Every difficulty is switched off — turn one back on."
                        : "No question here fits the current filters."}
                    </p>
                    {filtersActive && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-1 rounded-sm border border-border px-3 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((q, i) => {
                const status = progressMap[q.id]?.status ?? "not-started";
                const freq = frequencyFor(q);
                const isFlashing = flashId === q.id;
                const done = status === "completed";
                return (
                  <TableRow
                    key={q.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(q.id, el);
                      else rowRefs.current.delete(q.id);
                    }}
                    className={cn(
                      "group scroll-mt-32 border-0 transition-colors hover:bg-accent/40",
                      done && "bg-primary/[0.035]",
                      isFlashing && "animate-row-flash",
                      i < STAGGER_ROWS && "animate-row-in",
                    )}
                    style={i < STAGGER_ROWS ? { animationDelay: `${i * 22}ms` } : undefined}
                  >
                    <BodyCell className="pl-0 text-right">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground/50">
                        {String(i + 1).padStart(indexWidth, "0")}
                      </span>
                    </BodyCell>

                    <BodyCell>
                      <div className="flex items-center gap-0.5">
                        <StatusIcon
                          status={status}
                          celebrate={poppedId === q.id}
                          onClick={() => handleCycle(q.id)}
                        />
                        <QuestionNotes questionId={q.id} title={q.title} />
                      </div>
                    </BodyCell>

                    <BodyCell className="whitespace-normal">
                      <a
                        href={q.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-start gap-1.5 rounded-sm text-[13.5px] font-medium leading-snug outline-none transition-colors",
                          "hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
                          done && "text-muted-foreground line-through decoration-primary/40",
                        )}
                      >
                        <span>{q.title}</span>
                        <ExternalLink className="mt-0.5 size-3 shrink-0 text-transparent transition-colors group-hover:text-muted-foreground" />
                      </a>
                    </BodyCell>

                    <BodyCell>
                      <DifficultyBadge difficulty={q.difficulty} />
                    </BodyCell>

                    <BodyCell>
                      <FrequencyMeter value={freq} />
                    </BodyCell>

                    {hasTopics ? (
                      <BodyCell className="whitespace-normal">
                        <TopicsCell topics={q.topics} />
                      </BodyCell>
                    ) : (
                      <BodyCell className="pr-0 text-right">
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {q.acceptanceRate.toFixed(1)}%
                        </span>
                      </BodyCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {hasMore && (
          <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {visible.length.toLocaleString()} of {sorted.length.toLocaleString()}
            </span>
            {/* The observer normally gets here first; this is the fallback for
                keyboard users and anyone whose browser withholds the callback. */}
            <button
              type="button"
              onClick={() => setVisibleCount((n) => Math.min(n + PAGE_SIZE, sorted.length))}
              className="rounded-sm border border-border px-3 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HeadCell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <TableHead
      className={cn(
        // text-muted-foreground is explicit so tailwind-merge drops TableHead's
        // built-in text-foreground, which would otherwise beat label-micro.
        "label-micro h-8 border-b border-border px-2 pb-2 align-bottom text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function BodyCell({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <TableCell
      className={cn("border-b border-border/50 px-2 py-2.5 align-middle", className)}
      style={style}
    >
      {children}
    </TableCell>
  );
}

/**
 * Segmented tick meter. Reads as an instrument gauge rather than a progress
 * bar, which matters because frequency is a rating, not a completion state.
 */
function FrequencyMeter({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <span
        className="relative block h-2.5 shrink-0 overflow-hidden"
        style={{ width: METER_WIDTH }}
        aria-hidden
      >
        <span className="tick-track absolute inset-0 text-foreground/15" />
        <span
          className="tick-track absolute inset-y-0 left-0 text-primary transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </span>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {clamped.toFixed(1)}
      </span>
    </div>
  );
}

function TopicsCell({ topics }: { topics: string[] }) {
  if (topics.length === 0) {
    return <span className="font-mono text-xs text-muted-foreground/40">—</span>;
  }
  const visible = topics.slice(0, 3);
  const extra = topics.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <span
          key={t}
          className="rounded-[3px] bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
        >
          {t}
        </span>
      ))}
      {extra > 0 && (
        <span className="rounded-[3px] px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}
