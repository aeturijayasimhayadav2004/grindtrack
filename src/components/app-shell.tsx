"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { OfflineBanner } from "@/components/offline-banner";
import { QuestionTable } from "@/components/question-table";
import { SidebarContent } from "@/components/sidebar-content";
import { TopBar } from "@/components/top-bar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

        <main className="min-w-0 flex-1 overflow-y-auto bg-background">
          {company ? (
            <QuestionTable key={company} companySlug={company} highlightId={highlight} />
          ) : (
            <Dashboard />
          )}
        </main>
      </div>
    </div>
  );
}
