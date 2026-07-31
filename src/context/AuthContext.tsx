"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "grindtrack-account-email";

/**
 * Identity, not authentication.
 *
 * There is no password and no email verification: typing an address claims it.
 * The email is kept in localStorage and used to scope every `progress` row, so
 * "signing in" is really "tell the app which ledger to open". Anyone who knows
 * an address can open that ledger — an accepted tradeoff for a personal tool.
 */
interface AuthContextValue {
  email: string | null;
  /** True until localStorage has been read — render nothing rather than flash the login page. */
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Deliberately stricter than "has an @ and a dot": the address becomes a
 * primary key, and a typo silently opens an empty tracker rather than failing,
 * so a malformed one is worth catching at the door. Labels may not start or end
 * with a hyphen, dots may not repeat or sit at an edge, and the TLD must be at
 * least two letters. Applied to the normalized (trimmed, lowercased) value.
 */
const EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Returns null when valid, otherwise the reason — shown verbatim to the user. */
export function validateEmail(raw: string): string | null {
  const email = normalizeEmail(raw);

  if (email === "") return "Enter your email address.";
  if (email.length > 254) return "That email address is too long.";

  const at = email.indexOf("@");
  if (at === -1) return "Email needs an @ — for example you@example.com.";
  if (email.indexOf("@", at + 1) !== -1) return "Email can only contain one @.";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local === "") return "Add the part before the @ — for example you@example.com.";
  if (local.length > 64) return "The part before the @ is too long.";
  if (domain === "") return "Add a domain after the @ — for example you@example.com.";
  if (!domain.includes(".")) return "The domain needs a dot — for example you@example.com.";

  if (!EMAIL_PATTERN.test(email)) return "That doesn't look like a valid email address.";
  return null;
}

export function isValidEmail(raw: string): boolean {
  return validateEmail(raw) === null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isValidEmail(stored)) setEmail(normalizeEmail(stored));
    } catch {
      // Private mode / storage disabled — fall through to the login page.
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (input: string) => {
    const next = normalizeEmail(input);
    // Second gate. The form checks too, but this is the only path that can
    // create an account, so it must not depend on the caller having looked.
    const problem = validateEmail(next);
    if (problem) throw new Error(problem);

    // Register the account. This table is bookkeeping only — progress rows carry
    // the email themselves — so a failure here must not block sign-in.
    if (isSupabaseConfigured) {
      await supabase
        .from("users")
        .upsert({ email: next, last_seen_at: new Date().toISOString() }, { onConflict: "email" });
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Session-only sign-in is still better than refusing to start.
    }
    setEmail(next);
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored; clearing state below is enough.
    }
    setEmail(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ email, loading, signIn, signOut }),
    [email, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
