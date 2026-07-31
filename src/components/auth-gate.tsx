"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Client-side gate. The email lives in localStorage, so there is no server to
 * ask — we render nothing until it has been read, then either show the app or
 * bounce to /login. Deliberately not a security boundary: it decides which
 * ledger to open, not whether you are allowed one.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { email, loading } = useAuth();

  useEffect(() => {
    if (!loading && !email) router.replace("/login");
  }, [loading, email, router]);

  if (loading || !email) return null;
  return <>{children}</>;
}
