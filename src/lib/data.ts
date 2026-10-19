import { useCallback, useEffect, useState } from "react";
import companiesJson from "@/data/companies.json";
import type { Company, Difficulty, Question, TimeframeSlug } from "@/lib/types";

/**
 * Question data.
 *
 * Companies (~50 KB) ship in the bundle so the sidebar can render at once. The
 * questions themselves are fetched from a content-hashed static file built by
 * scripts/catalog.mjs: shipping the 6+ MB snapshot inside the JS bundle made
 * every visit download and parse it before the page could do anything.
 *
 * Call sites stay synchronous: <CatalogGate> holds the app back until
 * loadCatalog() has resolved, so everything below it can treat the data as
 * present.
 */

export const companies: Company[] = companiesJson as Company[];

/** Known without the catalog, so headline counts never wait on the fetch. */
export const totalQuestionCount = companies.reduce((n, c) => n + c.questionCount, 0);

const companyBySlug = new Map<string, Company>(companies.map((c) => [c.slug, c]));

export function getCompany(slug: string): Company | undefined {
  return companyBySlug.get(slug);
}

// --- Catalog --------------------------------------------------------------

const CATALOG_URL = process.env.NEXT_PUBLIC_CATALOG_URL ?? "";
const CATALOG_FORMAT = 1;
const FETCH_TIMEOUT_MS = 20_000;
const TIMEFRAMES: TimeframeSlug[] = ["30days", "3months", "6months", "moreThan6Months", "allTime"];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const LINK_PREFIX = "https://leetcode.com/problems/";

type ProblemTuple = [string, number, string, string | 0, string[]?];
type RowTuple = [number, number, number, ...(number | null)[]];

interface CatalogFile {
  format: number;
  companies: string[];
  problems: ProblemTuple[];
  rows: RowTuple[];
}

let questions: Question[] = [];
const questionsByCompany = new Map<string, Question[]>();
const questionById = new Map<string, Question>();

/** Inverse of encodeCatalog in scripts/catalog.mjs — keep the two in step. */
function decode(catalog: CatalogFile): Question[] {
  return catalog.rows.map(([c, p, acceptanceRate, ...freqs]) => {
    const [title, difficulty, linkSlug, idSlug, topics] = catalog.problems[p];
    const company = catalog.companies[c];
    const timeframes = TIMEFRAMES.filter((_, i) => freqs[i] != null);
    const frequencyByTimeframe: Partial<Record<TimeframeSlug, number>> = {};
    TIMEFRAMES.forEach((t, i) => {
      const f = freqs[i];
      if (f != null) frequencyByTimeframe[t] = f;
    });
    return {
      id: `${company}-${idSlug || linkSlug}`,
      title,
      difficulty: DIFFICULTIES[difficulty],
      frequency: frequencyByTimeframe[timeframes[0]] ?? 0,
      acceptanceRate,
      link: LINK_PREFIX + linkSlug,
      topics: topics ?? [],
      company,
      timeframe: timeframes[0] ?? "allTime",
      timeframes,
      frequencyByTimeframe,
    };
  });
}

function index(list: Question[]) {
  questions = list;
  questionsByCompany.clear();
  questionById.clear();
  for (const q of list) {
    const bucket = questionsByCompany.get(q.company);
    if (bucket) bucket.push(q);
    else questionsByCompany.set(q.company, [q]);
    questionById.set(q.id, q);
  }
}

async function fetchCatalog(): Promise<CatalogFile> {
  if (!CATALOG_URL) throw new Error("Question catalog URL is not configured.");
  // AbortSignal.timeout is missing before Safari 16 — fetch without a deadline there.
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(FETCH_TIMEOUT_MS)
      : undefined;
  const res = await fetch(CATALOG_URL, { signal });
  if (!res.ok) throw new Error(`Couldn't load questions (HTTP ${res.status}).`);
  const data = (await res.json()) as CatalogFile;
  if (data?.format !== CATALOG_FORMAT || !Array.isArray(data.rows)) {
    throw new Error("Question catalog is in an unexpected format.");
  }
  return data;
}

let pending: Promise<void> | null = null;
let loaded = false;

/** Fetches and indexes the catalog once; concurrent callers share the request. */
export function loadCatalog(): Promise<void> {
  if (loaded) return Promise.resolve();
  pending ??= fetchCatalog()
    .then((data) => {
      index(decode(data));
      loaded = true;
    })
    .catch((error: unknown) => {
      pending = null; // let a retry start over
      throw error;
    });
  return pending;
}

export type CatalogState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

export function useCatalog(): CatalogState & { retry: () => void } {
  const [state, setState] = useState<CatalogState>(
    loaded ? { status: "ready" } : { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded) {
      setState({ status: "ready" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    loadCatalog().then(
      () => !cancelled && setState({ status: "ready" }),
      (error: unknown) =>
        !cancelled &&
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Couldn't load questions.",
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

// Everything below assumes the catalog is loaded (see <CatalogGate>). Before
// that they return empty results rather than throwing.

export function getQuestions(): Question[] {
  return questions;
}

export function getCompanyQuestions(slug: string): Question[] {
  return questionsByCompany.get(slug) ?? [];
}

export function getQuestionById(id: string): Question | undefined {
  return questionById.get(id);
}

export function getRandomQuestion(): Question | undefined {
  return questions[Math.floor(Math.random() * questions.length)];
}

export const TIMEFRAME_LABELS: Record<Question["timeframe"], string> = {
  "30days": "30 Days",
  "3months": "3 Months",
  "6months": "6 Months",
  moreThan6Months: "6+ Months",
  allTime: "All Time",
};
