-- Grindtrack: the progress ledger. Run this BEFORE 002_accounts.sql.
-- Paste into the Supabase SQL editor. Safe to re-run.
--
-- This reconstructs the table as it existed before accounts were added, so that
-- 002 can apply its alterations on top and a fresh project ends up matching a
-- long-running one. On an existing database every statement here is a no-op.
--
-- NOTE: the policies are deliberately wide open — the anon key can read and
-- write every row. There is no auth; see 002 and the README.

create table if not exists public.progress (
  -- Matches the `id` field of a question in src/data/questions.json,
  -- e.g. 'google-two-sum'. 002 widens the key to (user_email, question_id).
  question_id text primary key,

  -- Underscored, unlike the hyphenated values the app uses. src/lib/supabase.ts
  -- maps between the two (toDbStatus / fromDbStatus).
  status text not null default 'not_started'
    check (status in ('not_started', 'attempted', 'completed')),

  notes text,

  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "public read progress" on public.progress;
create policy "public read progress" on public.progress for select using (true);

drop policy if exists "public insert progress" on public.progress;
create policy "public insert progress" on public.progress for insert with check (true);

drop policy if exists "public update progress" on public.progress;
create policy "public update progress" on public.progress for update using (true) with check (true);

drop policy if exists "public delete progress" on public.progress;
create policy "public delete progress" on public.progress for delete using (true);
