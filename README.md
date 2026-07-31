# Grindtrack

A personal LeetCode company-wise interview question tracker. Browse questions by
company and frequency timeframe, mark them attempted/completed, and keep notes.
Progress is stored in Supabase and scoped to an email you type on the login page.

Built with Next.js 14 (App Router), Tailwind, shadcn/ui, and supabase-js.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev
```

Both env vars come from your Supabase project under **Project Settings → API**:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (no `/rest/v1/` suffix) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `public` key |

Without them the app still runs — it degrades to an offline mode where nothing
is persisted, rather than crashing.

### Database

Apply the SQL in [`supabase/migrations/`](supabase/migrations/) via the Supabase
SQL editor. The app expects two tables:

- `progress` — one row per question per account, keyed by `(user_email, question_id)`
- `users` — bookkeeping only; records that an email has been seen

## Question data

`src/data/questions.json` and `src/data/companies.json` are **generated files that
are committed to the repo**. They are a locked snapshot, so builds are
reproducible and need no network access to a third-party repo.

To pull a fresher snapshot from upstream:

```bash
npm run build:data   # clones/refreshes the source repo, regenerates both JSON files
git add src/data
git commit -m "Refresh question snapshot"
```

The script clones [codenihar/leetcode-companywise-interview-questions](https://github.com/codenihar/leetcode-companywise-interview-questions)
into your temp directory, reuses that clone on later runs, and fetches updates
each time. It is deliberately **not** wired into `npm run build` — see
"Deployment" below.

## Deployment

Hosted on Vercel, which builds from the `main` branch.

- **Preview:** push any non-`main` branch — Vercel builds it and gives that
  branch its own preview URL.
- **Production:** merge to `main` — Vercel deploys it automatically.

Environment variables are configured in **Vercel → Project Settings →
Environment Variables** for both Production and Preview. `npm run build` runs
only `next build`; the data snapshot is read from the committed JSON, so no
network call to the upstream repo happens during a deploy.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run build:clean` | Production build, wiping `.next` first (see below) |
| `npm run start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run build:data` | Regenerate the question snapshot from upstream |

### Local builds are flaky on Windows

`next build` fails intermittently on this Windows machine — roughly one run in
three, including from a completely empty `.next`. The error varies between runs:

```
PageNotFoundError: Cannot find module for page: /_document
PageNotFoundError: Cannot find module for page: /_not-found
Error: Cannot find module './682.js'   (from .next/server/webpack-runtime.js)
```

It is **not a code error**. Every run reaches `✓ Compiled successfully` and
passes `Linting and checking validity of types`; the failure always lands later,
in the "Collecting page data" phase, where Next loads freshly-emitted chunks in
worker processes. The same commit builds and fails at random with no source
changes, which points at a file-visibility race between the emitting and loading
processes (Defender real-time scanning is a common trigger).

Just re-run it, or use `npm run build:clean` — it succeeds within a couple of
attempts.

`experimental: { workerThreads: false, cpus: 1 }` in `next.config.mjs` was tried
and **does not fix it** (still failed 1 of 3 clean builds), so it is deliberately
not configured here. Excluding the project directory and `node_modules` from
Defender real-time scanning is the more promising avenue if it becomes painful.

This has not been observed on Vercel, whose builders are Linux with no real-time
AV scanner.

## A note on access

There is no authentication. Typing an email claims it, and the row-level-security
policies are open to the anon key, so the email partitions data — it does not
protect it. That is an accepted tradeoff for a personal tool.
