"use client";

import { ArrowRight, Dices, Flame, Layers, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { CompanyMark } from "@/components/company-mark";
import { useProgress } from "@/hooks/useProgress";
import { companies, getRandomQuestion, questions } from "@/lib/data";
import { cn } from "@/lib/utils";

// A few recognisable names to seed the "jump straight in" strip.
const SHORTCUTS = ["google", "amazon", "meta", "microsoft", "apple", "stripe"];

export function Dashboard() {
  const router = useRouter();
  const { stats } = useProgress();

  const touched = stats.completed + stats.attempted;
  const pctDone = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  const featured = SHORTCUTS.map((slug) => companies.find((c) => c.slug === slug)).filter(
    (c): c is (typeof companies)[number] => Boolean(c),
  );

  function jumpToRandom() {
    const q = getRandomQuestion();
    router.push(`/?company=${q.company}&highlight=${encodeURIComponent(q.id)}`);
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Atmosphere layer: mesh wash, dot grid, and two drifting shapes. */}
      <div className="mesh pointer-events-none absolute inset-0" aria-hidden />
      <div className="dotgrid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      {/* Two slow-drifting light sources. At this alpha they never read as
          shapes — they just keep the large empty field from going dead flat. */}
      <div
        className="animate-drift pointer-events-none absolute -right-24 top-10 size-72 rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, var(--foreground), transparent 68%)",
        }}
        aria-hidden
      />
      <div
        className="animate-drift pointer-events-none absolute -left-20 bottom-0 size-80 rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, var(--foreground), transparent 68%)",
          animationDelay: "-6s",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-16">
        {/* Hero: copy left, live progress ring right. */}
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-10">
          <header className="animate-rise-in max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 backdrop-blur">
              <Flame className="size-3.5 text-hot" />
              <span className="label-micro">Personal tracker</span>
            </span>

            <h1 className="mt-5 text-balance font-display text-[2.25rem] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl">
              Pick a company.
              <br />
              <span className="text-sweep">Start grinding.</span>
            </h1>

            <p className="mt-5 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
              {questions.length.toLocaleString()} questions across{" "}
              {companies.length.toLocaleString()} companies, ranked by how often they actually
              show up.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={jumpToRandom}
                className="ring-sweep group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-[oklch(0.17_0.008_250)] outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
              >
                <Dices className="size-4 transition-transform duration-300 group-hover:rotate-180" />
                Random question
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <span className="text-[13px] text-muted-foreground">
                or hit <Kbd>/</Kbd> to search
              </span>
            </div>
          </header>

          <div className="animate-rise-in justify-self-center" style={{ animationDelay: "120ms" }}>
            <ProgressRing pct={pctDone} completed={stats.completed} total={stats.total} />
          </div>
        </div>

        {/* Stat trio — each owns a different accent so the row isn't three
            identical grey boxes. */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-4">
          <StatCard
            icon={Layers}
            label="Companies"
            value={companies.length}
            tint="var(--primary)"
            delay={180}
          />
          <StatCard
            icon={ListChecks}
            label="Questions"
            value={questions.length}
            tint="var(--hot)"
            delay={240}
          />
          {/* Odd one out in the two-up mobile grid — let it run full width
              rather than leave a gap beside it. */}
          <StatCard
            icon={Flame}
            label="In progress"
            value={touched}
            tint="var(--zest)"
            delay={300}
            className="max-sm:col-span-2"
          />
        </div>

        {/* Shortcut strip — the marks give the page actual colour. */}
        {featured.length > 0 && (
          <section className="animate-rise-in mt-10 sm:mt-12" style={{ animationDelay: "360ms" }}>
            <h2 className="label-micro">Jump straight in</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {featured.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => router.push(`/?company=${c.slug}`)}
                  className="group flex items-center gap-2.5 rounded-full border border-border bg-card/70 py-1.5 pl-1.5 pr-4 outline-none backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CompanyMark slug={c.slug} name={c.name} size="md" className="size-8" />
                  <span className="text-left">
                    <span className="block text-[13px] font-bold leading-tight">{c.name}</span>
                    <span className="block font-mono text-[10px] leading-tight text-muted-foreground">
                      {c.questionCount.toLocaleString()} qs
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/** Donut gauge with a gradient stroke — decorative, but it's real data. */
function ProgressRing({
  pct,
  completed,
  total,
}: {
  pct: number;
  completed: number;
  total: number;
}) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, pct)) / 100);

  return (
    <div className="relative grid size-48 place-items-center sm:size-64">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90" role="img" aria-label={`${pct.toFixed(1)}% complete`}>
        <defs>
          <linearGradient id="ring-sweep" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="55%" stopColor="var(--hot)" />
            <stop offset="100%" stopColor="var(--zest)" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-foreground/[0.07]"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#ring-sweep)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl font-extrabold tabular-nums sm:text-5xl">
          {completed.toLocaleString()}
        </span>
        <span className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          of {total.toLocaleString()} solved
        </span>
        <span className="mt-2 rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-primary">
          {pct < 0.1 && completed > 0 ? "<0.1" : pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  delay,
  className,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  tint: string;
  delay: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-rise-in group relative overflow-hidden rounded-xl border border-border bg-card/70 p-4 backdrop-blur transition-transform hover:-translate-y-0.5 sm:p-5",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: tint }}
        aria-hidden
      />
      <Icon className="size-4" style={{ color: tint }} />
      <div className="mt-3 font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
        {value.toLocaleString()}
      </div>
      <div className="label-micro mt-1.5">{label}</div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}
