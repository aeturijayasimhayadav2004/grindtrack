/**
 * Hand-written schema types for the Supabase tables.
 *
 * `progress` is keyed by (user_email, question_id) — one row per question per
 * account. `users` is a bookkeeping table: the app never reads it to decide who
 * you are, it just records that an email has been seen.
 */

export type ProgressRowStatus = "not_started" | "attempted" | "completed";

// Type aliases, not interfaces: supabase-js constrains table types to
// `Record<string, unknown>`, and only aliases get an implicit index signature.
export type ProgressRow = {
  user_email: string;
  question_id: string;
  status: ProgressRowStatus;
  notes: string | null;
  updated_at: string;
};

export type ProgressInsert = {
  user_email: string;
  question_id: string;
  status?: ProgressRowStatus;
  notes?: string | null;
  updated_at?: string;
};

export type ProgressUpdate = Partial<ProgressInsert>;

export type UserRow = {
  email: string;
  created_at: string;
  last_seen_at: string;
};

export type UserInsert = {
  email: string;
  created_at?: string;
  last_seen_at?: string;
};

export type UserUpdate = Partial<UserInsert>;

export type Database = {
  public: {
    Tables: {
      progress: {
        Row: ProgressRow;
        Insert: ProgressInsert;
        Update: ProgressUpdate;
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
