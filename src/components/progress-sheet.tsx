"use client";

import { ArrowUpRight, CircleCheckBig, Download, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/hooks/useProgress";
import { getQuestionById } from "@/lib/data";
import type { Difficulty } from "@/lib/types";

const DIFFICULTY_BAR_COLOR: Record<Difficulty, string> = {
  Easy: "bg-green-500",
  Medium: "bg-amber-500",
  Hard: "bg-red-500",
};

/** RFC4180: wrap in quotes and double any quote inside. */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function ProgressSheet() {
  const { getAllProgress, stats } = useProgress();
  const router = useRouter();
  const progressMap = getAllProgress();

  const { byDifficulty, recent } = useMemo(() => {
    const byDifficulty: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
    const completedEntries: { id: string; updatedAt: number }[] = [];

    for (const [id, entry] of Object.entries(progressMap)) {
      if (entry.status !== "completed") continue;
      completedEntries.push({ id, updatedAt: entry.updatedAt });
      const q = getQuestionById(id);
      if (q) byDifficulty[q.difficulty]++;
    }

    completedEntries.sort((a, b) => b.updatedAt - a.updatedAt);
    const recent = completedEntries.slice(0, 5).map((e) => ({
      ...e,
      question: getQuestionById(e.id),
    }));

    return { byDifficulty, recent };
  }, [progressMap]);

  const totalCompleted = byDifficulty.Easy + byDifficulty.Medium + byDifficulty.Hard;

  function goToQuestion(company: string, id: string) {
    router.push(`/?company=${company}&highlight=${encodeURIComponent(id)}`);
  }

  /**
   * Export every touched question as CSV. The progress table is the only thing
   * here that isn't reproducible from the repo, so being able to get a copy out
   * matters more than it would for the question data.
   */
  function exportCsv() {
    const rows = Object.entries(progressMap)
      .filter(([, entry]) => entry.status !== "not-started")
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt);

    const header = ["question_id", "title", "company", "difficulty", "status", "updated_at", "notes"];
    const body = rows.map(([id, entry]) => {
      const q = getQuestionById(id);
      return [
        csvCell(id),
        csvCell(q?.title),
        csvCell(q?.company),
        csvCell(q?.difficulty),
        csvCell(entry.status),
        csvCell(new Date(entry.updatedAt).toISOString()),
        csvCell(entry.notes),
      ].join(",");
    });

    const csv = [header.map(csvCell).join(","), ...body].join("\r\n");
    // BOM so Excel reads it as UTF-8 rather than mangling any non-ASCII title.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grindtrack-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="My progress" className="shrink-0">
          <TrendingUp className="size-[18px]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <span className="label-micro">Ledger</span>
          <SheetTitle className="mt-1 font-display text-2xl font-semibold tracking-tight">
            My Progress
          </SheetTitle>
          <SheetDescription>Practice status across every company.</SheetDescription>
          <button
            type="button"
            onClick={exportCsv}
            disabled={stats.completed + stats.attempted === 0}
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[12px] font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </SheetHeader>

        <div className="flex flex-col gap-9 overflow-y-auto px-5 pb-8 pt-6">
          {/* Hairline ledger instead of three bordered tiles. */}
          <div className="flex flex-col">
            <LedgerStat
              label="Completed"
              value={stats.completed}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <LedgerStat
              label="Attempted"
              value={stats.attempted}
              tone="text-amber-600 dark:text-amber-400"
            />
            <LedgerStat
              label="Not started"
              value={stats.notStarted}
              tone="text-muted-foreground"
              last
            />
          </div>

          <section>
            <h3 className="label-micro">Completed by difficulty</h3>
            {totalCompleted === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing completed yet — mark a question done to see the breakdown.
              </p>
            ) : (
              <>
                <div className="mt-3 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[2px]">
                  {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) =>
                    byDifficulty[d] > 0 ? (
                      <div
                        key={d}
                        className={`${DIFFICULTY_BAR_COLOR[d]} rounded-[1px] transition-all duration-500`}
                        style={{ width: `${(byDifficulty[d] / totalCompleted) * 100}%` }}
                        title={`${d}: ${byDifficulty[d]}`}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                    <span
                      key={d}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <span
                        className={`size-2 rounded-[2px] ${DIFFICULTY_BAR_COLOR[d]}`}
                        aria-hidden
                      />
                      {d}
                      <span className="font-mono tabular-nums text-foreground">
                        {byDifficulty[d]}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          <section>
            <h3 className="label-micro">Recently completed</h3>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {recent.map(({ id, updatedAt, question }) => (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={!question}
                      onClick={() => question && goToQuestion(question.company, question.id)}
                      className="group flex w-full items-center gap-2.5 border-b border-border/60 px-1 py-2.5 text-left text-[13px] outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <CircleCheckBig
                        className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                        strokeWidth={2.25}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {question?.title ?? "Unknown question"}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {relativeTime(updatedAt)}
                      </span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-transparent transition-colors group-hover:text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LedgerStat({
  label,
  value,
  tone,
  last,
}: {
  label: string;
  value: number;
  tone: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-3 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className="label-micro">{label}</span>
      <span className={`font-mono text-2xl font-semibold tabular-nums ${tone}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
