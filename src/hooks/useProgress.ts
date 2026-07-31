"use client";

import { useCallback, useMemo } from "react";
import { useProgressContext } from "@/context/ProgressContext";
import { questions } from "@/lib/data";
import type { ProgressMap, ProgressStatus } from "@/lib/types";

const STATUS_CYCLE: ProgressStatus[] = ["not-started", "attempted", "completed"];

function nextStatus(current: ProgressStatus): ProgressStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

/**
 * Supabase-backed progress tracker. Rows are fetched once by <ProgressProvider>
 * and cached in context; writes are applied optimistically and upserted in the
 * background. Rows are scoped to the signed-in email, so this hook only ever
 * sees the current account's progress.
 */
export function useProgress() {
  const { map, loading, offline, setStatus, setNotes, refresh } = useProgressContext();

  const getStatus = useCallback(
    (questionId: string): ProgressStatus => map[questionId]?.status ?? "not-started",
    [map],
  );

  const cycleStatus = useCallback(
    (questionId: string): ProgressStatus => {
      const upcoming = nextStatus(map[questionId]?.status ?? "not-started");
      setStatus(questionId, upcoming);
      return upcoming;
    },
    [map, setStatus],
  );

  const getAllProgress = useCallback((): ProgressMap => map, [map]);

  const getNotes = useCallback((questionId: string): string => map[questionId]?.notes ?? "", [map]);

  const stats = useMemo(() => {
    let completed = 0;
    let attempted = 0;
    for (const entry of Object.values(map)) {
      if (entry.status === "completed") completed++;
      else if (entry.status === "attempted") attempted++;
    }
    const total = questions.length;
    return { completed, attempted, notStarted: total - completed - attempted, total };
  }, [map]);

  return {
    getStatus,
    setStatus,
    cycleStatus,
    getAllProgress,
    stats,
    getNotes,
    setNotes,
    loading,
    offline,
    refresh,
  };
}
