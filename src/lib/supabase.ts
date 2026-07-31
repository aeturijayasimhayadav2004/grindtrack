import { createClient } from "@supabase/supabase-js";
import type { Database, ProgressRowStatus } from "@/lib/database.types";
import type { ProgressStatus } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * False until both env vars are set. Every call site checks this first so a
 * missing or incomplete .env.local degrades to "offline" instead of crashing.
 */
export const isSupabaseConfigured = supabaseUrl !== "" && supabaseAnonKey !== "";

/**
 * Single shared client. No auth: this is a personal app and the anon key is the
 * only credential. The placeholder values below exist only so `createClient`
 * doesn't throw on an unconfigured checkout — they never reach a request.
 */
export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : "http://localhost:54321",
  isSupabaseConfigured ? supabaseAnonKey : "not-configured",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const STATUS_TO_DB: Record<ProgressStatus, ProgressRowStatus> = {
  "not-started": "not_started",
  attempted: "attempted",
  completed: "completed",
};

const STATUS_FROM_DB: Record<ProgressRowStatus, ProgressStatus> = {
  not_started: "not-started",
  attempted: "attempted",
  completed: "completed",
};

/** The app uses hyphenated status values; the table's check constraint uses underscores. */
export function toDbStatus(status: ProgressStatus): ProgressRowStatus {
  return STATUS_TO_DB[status];
}

export function fromDbStatus(status: string): ProgressStatus {
  return STATUS_FROM_DB[status as ProgressRowStatus] ?? "not-started";
}
