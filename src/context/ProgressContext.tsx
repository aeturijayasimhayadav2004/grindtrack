"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { ProgressInsert, ProgressRow } from "@/lib/database.types";
import { fromDbStatus, isSupabaseConfigured, supabase, toDbStatus } from "@/lib/supabase";
import type { ProgressEntry, ProgressMap, ProgressStatus } from "@/lib/types";

const RETRY_DELAY_MS = 2000;

interface ProgressContextValue {
  map: ProgressMap;
  loading: boolean;
  offline: boolean;
  setStatus: (questionId: string, status: ProgressStatus) => void;
  setNotes: (questionId: string, notes: string) => void;
  refresh: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function rowsToMap(rows: ProgressRow[]): ProgressMap {
  const map: ProgressMap = {};
  for (const row of rows) {
    map[row.question_id] = {
      status: fromDbStatus(row.status),
      updatedAt: new Date(row.updated_at).getTime(),
      notes: row.notes,
    };
  }
  return map;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upsert with one retry. Network blips are the common failure mode for a
 * personal app on a laptop, so a single delayed retry recovers most of them
 * before we bother the user with a toast.
 */
async function upsertWithRetry(row: ProgressInsert): Promise<string | null> {
  const attempt = () =>
    supabase.from("progress").upsert(row, { onConflict: "user_email,question_id" });

  const first = await attempt();
  if (!first.error) return null;

  await sleep(RETRY_DELAY_MS);
  const second = await attempt();
  return second.error ? second.error.message : null;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { email } = useAuth();
  const [map, setMapState] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Mirror of `map` updated synchronously, so back-to-back writes in a single
  // tick (and the rollback path) always see the latest value.
  const mapRef = useRef<ProgressMap>({});

  // Guards against a slow fetch for a previous account landing after a switch.
  const emailRef = useRef<string | null>(email);
  emailRef.current = email;

  const commit = useCallback((next: ProgressMap) => {
    mapRef.current = next;
    setMapState(next);
  }, []);

  const load = useCallback(async () => {
    if (!email) {
      commit({});
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setOffline(true);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from("progress").select("*").eq("user_email", email);
    if (emailRef.current !== email) return; // signed out or switched mid-flight

    if (error) {
      setOffline(true);
      setLoading(false);
      return;
    }
    commit(rowsToMap(data ?? []));
    setOffline(false);
    setLoading(false);
  }, [commit, email]);

  // One fetch per account; components read the cached map from context. Clearing
  // first means a switched account never briefly shows the previous one's rows.
  useEffect(() => {
    commit({});
    setLoading(true);
    void load();
  }, [commit, load]);

  const refresh = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  const write = useCallback(
    (
      questionId: string,
      entry: ProgressEntry,
      previous: ProgressEntry | undefined,
      rollback: boolean,
    ) => {
      if (!isSupabaseConfigured || !email) {
        setOffline(true);
        return;
      }

      void (async () => {
        const error = await upsertWithRetry({
          user_email: email,
          question_id: questionId,
          status: toDbStatus(entry.status),
          notes: entry.notes,
          updated_at: new Date(entry.updatedAt).toISOString(),
        });

        if (!error) {
          setOffline(false);
          return;
        }

        setOffline(true);

        // Only roll back if nothing newer landed on this question meanwhile, and
        // only while we're still looking at the account the write belonged to.
        if (
          rollback &&
          emailRef.current === email &&
          mapRef.current[questionId]?.updatedAt === entry.updatedAt
        ) {
          const next = { ...mapRef.current };
          if (previous) next[questionId] = previous;
          else delete next[questionId];
          commit(next);
        }

        toast.error("Couldn't save to Supabase", { description: error });
      })();
    },
    [commit, email],
  );

  const setStatus = useCallback(
    (questionId: string, status: ProgressStatus) => {
      const previous = mapRef.current[questionId];
      const entry: ProgressEntry = {
        status,
        updatedAt: Date.now(),
        notes: previous?.notes ?? null,
      };

      commit({ ...mapRef.current, [questionId]: entry }); // optimistic
      write(questionId, entry, previous, true);
    },
    [commit, write],
  );

  const setNotes = useCallback(
    (questionId: string, notes: string) => {
      const previous = mapRef.current[questionId];
      const entry: ProgressEntry = {
        status: previous?.status ?? "not-started",
        updatedAt: Date.now(),
        notes: notes.trim() === "" ? null : notes,
      };

      commit({ ...mapRef.current, [questionId]: entry });
      // No rollback for notes: silently deleting text the user just typed is
      // worse than leaving it on screen next to the failure toast.
      write(questionId, entry, previous, false);
    },
    [commit, write],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({ map, loading, offline, setStatus, setNotes, refresh }),
    [map, loading, offline, setStatus, setNotes, refresh],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgressContext(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgressContext must be used inside <ProgressProvider>");
  }
  return ctx;
}
