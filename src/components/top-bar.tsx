"use client";

import { Menu } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { ProgressSheet } from "@/components/progress-sheet";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopBar({
  onOpenMobileMenu,
  onGoHome,
}: {
  onOpenMobileMenu: () => void;
  onGoHome: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-stretch border-b border-border bg-background/80 backdrop-blur-md">
      {/* Masthead cell is locked to the sidebar's 18rem so the rail reads as one
          continuous column from the very top of the page. */}
      <div className="flex min-w-0 shrink items-center gap-2 border-border pl-2 pr-2 md:w-72 md:shrink-0 md:border-r md:pl-4 md:pr-3">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1 shrink-0 md:hidden"
          aria-label="Open menu"
          onClick={onOpenMobileMenu}
        >
          <Menu className="size-5" />
        </Button>

        <button
          type="button"
          onClick={onGoHome}
          className="group flex min-w-0 items-center gap-2.5 rounded-sm py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="ring-sweep grid size-8 shrink-0 place-items-center rounded-lg font-mono text-[14px] font-bold text-[oklch(0.17_0.008_250)] transition-transform duration-200 group-hover:-rotate-6"
            aria-hidden
          >
            G
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">
              Grindtrack
            </span>
            <span className="label-micro mt-1 hidden md:block">Interview ledger</span>
          </span>
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1 px-2 sm:gap-2 sm:px-4">
        <GlobalSearch />
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <ProgressSheet />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
