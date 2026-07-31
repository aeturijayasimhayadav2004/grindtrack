import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <AppShell />
      </AuthGate>
    </Suspense>
  );
}
