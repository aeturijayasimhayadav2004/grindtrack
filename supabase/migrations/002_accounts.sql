-- Grindtrack: add email-keyed accounts and scope progress to them.
-- Paste into the Supabase SQL editor and run once. Safe to re-run.
--
-- NOTE: these policies stay wide open (anon key can read/write every row).
-- There is no auth, so the email column partitions data, it does not protect it.

-- 1. Accounts -----------------------------------------------------------------
create table if not exists public.users (
  email        text primary key,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "public read users" on public.users;
create policy "public read users" on public.users for select using (true);

drop policy if exists "public insert users" on public.users;
create policy "public insert users" on public.users for insert with check (true);

drop policy if exists "public update users" on public.users;
create policy "public update users" on public.users for update using (true) with check (true);

-- 2. Scope progress by account ------------------------------------------------
alter table public.progress add column if not exists user_email text;

-- Existing rows predate accounts. Change this address to your own if you want
-- to keep that history under your login instead of parking it.
update public.progress
   set user_email = 'legacy@grindtrack.local'
 where user_email is null;

alter table public.progress alter column user_email set not null;

-- Swap the primary key from (question_id) to (user_email, question_id) so two
-- accounts can hold the same question. The old constraint name is looked up
-- rather than assumed.
do $$
declare pk_name text;
begin
  select conname into pk_name
    from pg_constraint
   where conrelid = 'public.progress'::regclass
     and contype = 'p';

  if pk_name is not null and pk_name <> 'progress_user_email_question_id_pkey' then
    execute format('alter table public.progress drop constraint %I', pk_name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.progress'::regclass and contype = 'p'
  ) then
    alter table public.progress
      add constraint progress_user_email_question_id_pkey
      primary key (user_email, question_id);
  end if;
end $$;

-- Every read is "all rows for one email".
create index if not exists progress_user_email_idx on public.progress (user_email);
