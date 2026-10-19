"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { OfflineBanner } from "@/components/offline-banner";
import { QuestionTable } from "@/components/question-table";
import { SidebarContent } from "@/components/sidebar-content";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getCompany } from "@/lib/data";

export function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const company = searchParams.get("company");
  const highlight = searchParams.get("highlight") ?? undefined;

  function selectCompany(slug: string) {
    router.push(`${pathname}?company=${slug}`);
    setMobileOpen(false);
  }

  function goHome() {
    router.push(pathname);
  }

  return (
    <div className="flex h-dvh flex-col">
      <TopBar onOpenMobileMenu={() => setMobileOpen(true)} onGoHome={goHome} />
      <OfflineBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar md:flex">
          <SidebarContent selectedSlug={company} onSelect={selectCompany} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 sm:max-w-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Companies</SheetTitle>
              <SheetDescription>Browse and select a company</SheetDescription>
            </SheetHeader>
            <SidebarContent selectedSlug={company} onSelect={selectCompany} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background">
          {company && !getCompany(company) ? (
            <UnknownCompany slug={company} onGoHome={goHome} />
          ) : company ? (
            <QuestionTable key={company} companySlug={company} highlightId={highlight} />
          ) : (
            <Dashboard />
          )}
        </main>
      </div>
    </div>
  );
}

/** A stale or hand-edited ?company= link — say so rather than show an empty table. */
function UnknownCompany({ slug, onGoHome }: { slug: string; onGoHome: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-24 text-center">
      <span className="grid size-11 place-items-center rounded-sm border border-dashed border-border text-muted-foreground">
        <SearchX className="size-5" />
      </span>
      <p className="text-lg font-semibold tracking-tight">No company called &ldquo;{slug}&rdquo;</p>
      <p className="text-sm text-muted-foreground">
        The link may be out of date. Pick a company from the list instead.
      </p>
      <Button variant="outline" size="sm" onClick={onGoHome} className="mt-1">
        Back to dashboard
      </Button>
    </div>
  );
}
