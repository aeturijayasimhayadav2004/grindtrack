"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CompanyMark } from "@/components/company-mark";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { companies, questions } from "@/lib/data";
import type { Question } from "@/lib/types";

const companyNameBySlug = new Map(companies.map((c) => [c.slug, c.name]));

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches: Question[] = [];
    for (const question of questions) {
      if (question.title.toLowerCase().includes(q)) {
        matches.push(question);
        if (matches.length >= 20) break;
      }
    }
    return matches;
  }, [query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Question[]>();
    for (const r of results) {
      const list = groups.get(r.company);
      if (list) list.push(r);
      else groups.set(r.company, [r]);
    }
    return [...groups.entries()];
  }, [results]);

  function selectResult(question: Question) {
    setOpen(false);
    setQuery("");
    router.push(`/?company=${question.company}&highlight=${encodeURIComponent(question.id)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Search ${questions.length.toLocaleString()} questions`}
        // Collapses to a square icon button on phones — the full-width field
        // would squeeze the wordmark and the account controls off the bar.
        className="group flex size-9 shrink-0 items-center justify-center gap-2 rounded-sm border border-input bg-background/40 text-left outline-none transition-colors hover:border-primary/50 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring sm:w-72 sm:justify-start sm:px-2.5"
      >
        <Search className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:size-3.5" />
        <span className="hidden min-w-0 flex-1 truncate text-[13px] text-muted-foreground sm:block">
          Search {questions.length.toLocaleString()} questions…
        </span>
        <kbd className="pointer-events-none hidden h-5 min-w-5 shrink-0 items-center justify-center rounded-[3px] border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          /
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search questions"
        description="Search question titles across all companies"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search question titles…"
            value={query}
            onValueChange={setQuery}
            // 16px minimum below sm, otherwise iOS Safari zooms into the
            // dialog on focus and leaves the page scaled.
            className="text-base sm:text-sm"
          />
          <CommandList>
            {query.trim() === "" ? (
              <CommandEmpty>
                Start typing to search {questions.length.toLocaleString()} questions…
              </CommandEmpty>
            ) : results.length === 0 ? (
              <CommandEmpty>No questions found.</CommandEmpty>
            ) : (
              grouped.map(([companySlug, items]) => (
                <CommandGroup
                  key={companySlug}
                  heading={companyNameBySlug.get(companySlug) ?? companySlug}
                >
                  {items.map((q) => (
                    <CommandItem
                      key={q.id}
                      value={q.id}
                      onSelect={() => selectResult(q)}
                      className="gap-2.5"
                    >
                      <CompanyMark
                        slug={q.company}
                        name={companyNameBySlug.get(q.company) ?? q.company}
                      />
                      <span className="min-w-0 flex-1 truncate">{q.title}</span>
                      <DifficultyBadge difficulty={q.difficulty} className="shrink-0" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
