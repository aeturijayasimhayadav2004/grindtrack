import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { CatalogGate } from "@/components/catalog-gate";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <CatalogGate>
          <AppShell />
        </CatalogGate>
      </AuthGate>
    </Suspense>
  );
}
