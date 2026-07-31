/**
 * Clones codenihar/leetcode-companywise-interview-questions and normalizes every
 * company CSV into src/data/questions.json + src/data/companies.json.
 *
 * Source layout (verified by inspecting the repo directly, not assumed):
 *   <company-slug>/thirty-days.csv
 *   <company-slug>/three-months.csv
 *   <company-slug>/six-months.csv
 *   <company-slug>/more-than-six-months.csv
 *   <company-slug>/all.csv
 *   each CSV header: ID,URL,Title,Difficulty,Acceptance %,Frequency %
 * Not every company has every file. No topics/tags column exists in the source.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_URL =
  "https://github.com/codenihar/leetcode-companywise-interview-questions.git";
const CLONE_DIR = path.join(os.tmpdir(), "leetcode-companywise-source");
const OUT_DIR = path.join(process.cwd(), "src", "data");

type Difficulty = "Easy" | "Medium" | "Hard";

// Ordered narrowest (most recent) -> broadest. First match wins for the
// question's primary frequency; every match is recorded in `timeframes`.
type TimeframeSlug =
  | "30days"
  | "3months"
  | "6months"
  | "moreThan6Months"
  | "allTime";

const TIMEFRAME_FILES: { file: string; slug: TimeframeSlug }[] = [
  { file: "thirty-days.csv", slug: "30days" },
  { file: "three-months.csv", slug: "3months" },
  { file: "six-months.csv", slug: "6months" },
  { file: "more-than-six-months.csv", slug: "moreThan6Months" },
  { file: "all.csv", slug: "allTime" },
];

interface Question {
  id: string;
  title: string;
  difficulty: Difficulty;
  frequency: number;
  acceptanceRate: number;
  link: string;
  topics: string[];
  company: string;
  timeframe: TimeframeSlug;
  timeframes: TimeframeSlug[];
  frequencyByTimeframe: Partial<Record<TimeframeSlug, number>>;
}

interface Company {
  slug: string;
  name: string;
  questionCount: number;
}

/**
 * Clones the source repo, or brings an existing cached clone up to date.
 *
 * The refresh matters: this script exists to take a *fresh* snapshot, and a
 * cached clone that is never fetched would silently regenerate the previous
 * snapshot forever. A failed fetch (offline) is not fatal — it falls back to
 * whatever the cache holds and says so.
 */
function ensureSourceRepo(): string {
  if (!fs.existsSync(path.join(CLONE_DIR, ".git"))) {
    fs.rmSync(CLONE_DIR, { recursive: true, force: true });
    console.log(`Cloning ${REPO_URL} -> ${CLONE_DIR} ...`);
    execSync(`git clone --depth 1 "${REPO_URL}" "${CLONE_DIR}"`, {
      stdio: "inherit",
    });
    return CLONE_DIR;
  }

  console.log(`Refreshing cached clone at ${CLONE_DIR} ...`);
  try {
    // A --depth 1 clone has no tracking branch to `git pull`, so fetch the
    // remote head explicitly and hard-reset onto it, staying shallow.
    execSync(`git -C "${CLONE_DIR}" fetch --depth 1 origin HEAD`, {
      stdio: "inherit",
    });
    execSync(`git -C "${CLONE_DIR}" reset --hard FETCH_HEAD`, {
      stdio: "inherit",
    });
    execSync(`git -C "${CLONE_DIR}" clean -fd`, { stdio: "inherit" });
  } catch {
    console.warn("Could not refresh the clone (offline?). Using cached copy as-is.");
  }
  return CLONE_DIR;
}

/** Minimal RFC4180-ish CSV line splitter: handles quoted fields with commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].length > 0));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const NAME_OVERRIDES: Record<string, string> = {
  att: "AT&T",
  ibm: "IBM",
  hp: "HP",
  hpe: "HPE",
  hsbc: "HSBC",
  hbo: "HBO",
  htc: "HTC",
  ubs: "UBS",
  ea: "Electronic Arts",
  sap: "SAP",
  kpmg: "KPMG",
  pwc: "PwC",
  ey: "EY",
  bcg: "BCG",
  ncr: "NCR",
  dtcc: "DTCC",
  hcl: "HCL",
  tcs: "TCS",
  lti: "LTI",
  ivp: "IVP",
  rbc: "RBC",
  bt: "BT",
  bnp: "BNP",
  jd: "JD.com",
  vk: "VK",
  ge: "GE",
  lg: "LG",
  dji: "DJI",
  jpmorgan: "JPMorgan",
  amd: "AMD",
  amc: "AMC",
  bny: "BNY",
  fpt: "FPT",
  npci: "NPCI",
  ukg: "UKG",
  okx: "OKX",
  wix: "Wix",
  xing: "XING",
  zs: "ZS Associates",
  tiaa: "TIAA",
  msci: "MSCI",
  nasdaq: "Nasdaq",
  drw: "DRW",
  imc: "IMC",
  hrt: "HRT",
  sig: "SIG",
};

function humanizeCompanyName(slug: string): string {
  return slug
    .split("-")
    .map((word) => NAME_OVERRIDES[word] ?? word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function isCompanyDir(dirPath: string): boolean {
  return TIMEFRAME_FILES.some(({ file }) => fs.existsSync(path.join(dirPath, file)));
}

function parseNumericPercent(raw: string): number {
  const n = parseFloat(raw.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeDifficulty(raw: string): Difficulty {
  const v = raw.trim();
  if (v === "Easy" || v === "Medium" || v === "Hard") return v;
  throw new Error(`Unexpected difficulty value: "${raw}"`);
}

function buildCompanyQuestions(companySlug: string, companyDir: string): Question[] {
  const byTitleSlug = new Map<string, Question>();

  for (const { file, slug: timeframe } of TIMEFRAME_FILES) {
    const csvPath = path.join(companyDir, file);
    if (!fs.existsSync(csvPath)) continue;

    const text = fs.readFileSync(csvPath, "utf-8");
    const rows = parseCsv(text);
    if (rows.length === 0) continue;

    const header = rows[0].map((h) => h.trim());
    const idx = {
      url: header.indexOf("URL"),
      title: header.indexOf("Title"),
      difficulty: header.indexOf("Difficulty"),
      acceptance: header.indexOf("Acceptance %"),
      frequency: header.indexOf("Frequency %"),
    };
    if (Object.values(idx).some((i) => i === -1)) {
      throw new Error(`Unexpected CSV header in ${csvPath}: ${header.join(",")}`);
    }

    for (const row of rows.slice(1)) {
      const title = row[idx.title]?.trim();
      if (!title) continue;
      const titleSlug = slugify(title);
      const frequency = parseNumericPercent(row[idx.frequency] ?? "0");

      const existing = byTitleSlug.get(titleSlug);
      if (!existing) {
        byTitleSlug.set(titleSlug, {
          id: `${companySlug}-${titleSlug}`,
          title,
          difficulty: normalizeDifficulty(row[idx.difficulty] ?? "Medium"),
          frequency,
          acceptanceRate: parseNumericPercent(row[idx.acceptance] ?? "0"),
          link: row[idx.url]?.trim() ?? "",
          topics: [],
          company: companySlug,
          timeframe,
          timeframes: [timeframe],
          frequencyByTimeframe: { [timeframe]: frequency },
        });
      } else {
        if (!existing.timeframes.includes(timeframe)) {
          existing.timeframes.push(timeframe);
        }
        existing.frequencyByTimeframe[timeframe] = frequency;
        // first (narrowest/most-recent) timeframe already set frequency/timeframe; keep it.
      }
    }
  }

  return [...byTitleSlug.values()];
}

function main() {
  const sourceRoot = ensureSourceRepo();

  const entries = fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  const allQuestions: Question[] = [];
  const companies: Company[] = [];

  for (const companySlug of entries) {
    const companyDir = path.join(sourceRoot, companySlug);
    if (!isCompanyDir(companyDir)) continue;

    const questions = buildCompanyQuestions(companySlug, companyDir);
    if (questions.length === 0) continue;

    allQuestions.push(...questions);
    companies.push({
      slug: companySlug,
      name: humanizeCompanyName(companySlug),
      questionCount: questions.length,
    });
  }

  companies.sort((a, b) => a.name.localeCompare(b.name));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "questions.json"),
    JSON.stringify(allQuestions),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "companies.json"),
    JSON.stringify(companies, null, 2),
  );

  console.log(`\nDone.`);
  console.log(`Total companies: ${companies.length}`);
  console.log(`Total questions: ${allQuestions.length}`);
}

main();
