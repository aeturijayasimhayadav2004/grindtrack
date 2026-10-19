/**
 * Builds the client question catalog from the committed snapshot.
 *
 * src/data/questions.json (6+ MB) stays the source of truth, but it is far too
 * big to ship inside the JS bundle: 17k rows describe only ~3.4k distinct
 * problems. This writes a normalized copy to public/data/catalog-<hash>.json,
 * which the browser fetches once and the CDN can cache forever — the hash is
 * of the snapshot, so a refreshed snapshot gets a new URL.
 *
 * Imported by next.config.mjs, so every `next dev` / `next build` makes sure the
 * file exists. No network access: this is a pure transform of a local file.
 *
 * Format (v1) — positional arrays to keep the payload small:
 *   problems: [title, difficulty(0|1|2), linkSlug, idSlug | 0, topics?]
 *             idSlug is 0 when it equals linkSlug (true for all but ~160).
 *   rows:     [companyIndex, problemIndex, acceptanceRate, f30d, f3m, f6m, f6m+, fAll]
 *             in the snapshot's original order; a null frequency means the
 *             question is absent from that timeframe.
 * src/lib/data.ts decodes it back into exactly the original Question objects.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const CATALOG_FORMAT = 1;
export const TIMEFRAMES = ["30days", "3months", "6months", "moreThan6Months", "allTime"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const LINK_PREFIX = "https://leetcode.com/problems/";

const root = process.cwd();
const QUESTIONS = path.join(root, "src", "data", "questions.json");
const COMPANIES = path.join(root, "src", "data", "companies.json");
const OUT_DIR = path.join(root, "public", "data");

/** Short content hash of the snapshot (and format), used in the file name. */
export function catalogVersion() {
  const hash = crypto.createHash("sha256");
  hash.update(`v${CATALOG_FORMAT}\n`);
  hash.update(fs.readFileSync(QUESTIONS));
  hash.update(fs.readFileSync(COMPANIES));
  return hash.digest("hex").slice(0, 12);
}

export function catalogFileName(version = catalogVersion()) {
  return `catalog-${version}.json`;
}

export function encodeCatalog(questions, companies) {
  const companyIndex = new Map(companies.map((c, i) => [c.slug, i]));
  const problemIndex = new Map();
  const problems = [];
  const rows = [];

  for (const q of questions) {
    if (!q.link.startsWith(LINK_PREFIX)) throw new Error(`Unexpected link for ${q.id}: ${q.link}`);
    const linkSlug = q.link.slice(LINK_PREFIX.length);
    const idSlug = q.id.slice(q.company.length + 1);
    if (q.id !== `${q.company}-${idSlug}`) throw new Error(`Unexpected id ${q.id}`);
    const difficulty = DIFFICULTIES.indexOf(q.difficulty);
    if (difficulty === -1) throw new Error(`Unexpected difficulty for ${q.id}: ${q.difficulty}`);

    // Keyed on everything stored per problem, so two rows only share an entry
    // when decoding either one gives back exactly what went in.
    const key = JSON.stringify([q.title, difficulty, linkSlug, idSlug, q.topics]);
    let p = problemIndex.get(key);
    if (p === undefined) {
      p = problems.length;
      problemIndex.set(key, p);
      const entry = [q.title, difficulty, linkSlug, idSlug === linkSlug ? 0 : idSlug];
      if (q.topics.length > 0) entry.push(q.topics);
      problems.push(entry);
    }

    const c = companyIndex.get(q.company);
    if (c === undefined) throw new Error(`Question ${q.id} references unknown company ${q.company}`);

    rows.push([
      c,
      p,
      q.acceptanceRate,
      ...TIMEFRAMES.map((t) => q.frequencyByTimeframe[t] ?? null),
    ]);
  }

  return { format: CATALOG_FORMAT, companies: companies.map((c) => c.slug), problems, rows };
}

/** Mirror of the decoder in src/lib/data.ts — used to prove the round trip. */
export function decodeCatalog(catalog) {
  return catalog.rows.map(([c, p, acceptanceRate, ...freqs]) => {
    const [title, difficulty, linkSlug, idSlug, topics] = catalog.problems[p];
    const company = catalog.companies[c];
    const timeframes = TIMEFRAMES.filter((_, i) => freqs[i] !== null);
    const frequencyByTimeframe = {};
    for (const t of timeframes) frequencyByTimeframe[t] = freqs[TIMEFRAMES.indexOf(t)];
    return {
      id: `${company}-${idSlug || linkSlug}`,
      title,
      difficulty: DIFFICULTIES[difficulty],
      frequency: frequencyByTimeframe[timeframes[0]],
      acceptanceRate,
      link: LINK_PREFIX + linkSlug,
      topics: topics ?? [],
      company,
      timeframe: timeframes[0],
      timeframes,
      frequencyByTimeframe,
    };
  });
}

/**
 * Writes the catalog if the current snapshot's file is missing, verifying the
 * round trip first so a lossy encoding fails the build instead of shipping.
 * Removes catalogs from older snapshots. Returns the public file name.
 */
export function ensureCatalog() {
  const version = catalogVersion();
  const fileName = catalogFileName(version);
  const outFile = path.join(OUT_DIR, fileName);
  if (fs.existsSync(outFile)) return fileName;

  const questions = JSON.parse(fs.readFileSync(QUESTIONS, "utf8"));
  const companies = JSON.parse(fs.readFileSync(COMPANIES, "utf8"));
  const catalog = encodeCatalog(questions, companies);

  if (JSON.stringify(decodeCatalog(catalog)) !== JSON.stringify(questions)) {
    throw new Error("Catalog round trip does not reproduce src/data/questions.json");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Write-then-rename: Next loads its config in several processes at once, and
  // none of them may ever see a half-written file.
  const tmp = `${outFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(catalog));
  fs.renameSync(tmp, outFile);

  for (const name of fs.readdirSync(OUT_DIR)) {
    if (/^catalog-[0-9a-f]+\.json$/.test(name) && name !== fileName) {
      fs.rmSync(path.join(OUT_DIR, name), { force: true });
    }
  }
  return fileName;
}

// `node scripts/catalog.mjs` — regenerate by hand.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Wrote public/data/${ensureCatalog()}`);
}
