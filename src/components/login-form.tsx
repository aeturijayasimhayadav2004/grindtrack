"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, validateEmail } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const { email, loading, signIn } = useAuth();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — don't sit on a login page you can't use.
  useEffect(() => {
    if (!loading && email) router.replace("/");
  }, [loading, email, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const problem = validateEmail(value);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signIn(value);
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't sign in.");
      setSubmitting(false);
    }
  }

  if (loading || email) return null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary font-mono text-sm font-bold text-primary-foreground"
            aria-hidden
          >
            G
          </span>
          <span>
            <span className="block font-display text-[19px] font-semibold leading-none tracking-tight">
              Grindtrack
            </span>
            <span className="label-micro mt-1 block">Interview ledger</span>
          </span>
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email to open your tracker. No password, no verification — first time through
          creates the account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="label-micro">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null); // don't nag mid-correction
              }}
              // Flag a typo on the way out of the field, not only on submit.
              onBlur={() => {
                if (value.trim() !== "") setError(validateEmail(value));
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "email-error" : undefined}
              disabled={submitting}
            />
            {error ? (
              <p id="email-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Opening your tracker…" : "Continue"}
          </Button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Your progress is stored against this address. Anyone who enters the same address sees the
          same tracker — this is a personal tool, not a secured account.
        </p>
      </div>
    </main>
  );
}
