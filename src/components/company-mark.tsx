import { cn } from "@/lib/utils";

/**
 * Generated identity tile for a company.
 *
 * There are no logo assets in the dataset and fetching them from a third party
 * would leak which companies you browse, so each mark is derived from the slug
 * instead: same company always gets the same tile, every time.
 *
 * The hue wheel is back — 656 companies still land on distinct tiles — but at
 * roughly a third of the chroma it used to run at, and inside a fixed
 * luminance band. The rail reads as tinted metal rather than as a paint chart,
 * and no tile can outshout the row it sits in.
 */

const SIZES = {
  sm: "size-6 rounded-md text-[9px]",
  md: "size-9 rounded-lg text-[12px]",
  lg: "size-14 rounded-xl text-[19px]",
} as const;

export type CompanyMarkSize = keyof typeof SIZES;

// Tiles stay in a mid luminance band: dark enough that bone initials clear
// 4.5:1 on every hue, light enough to read as a raised chip on graphite.
const TONE_FLOOR = 0.36;
const TONE_RANGE = 0.14;
// Well under the 0.16-0.2 the original marks used. Enough to tell two
// companies apart, not enough to compete with the difficulty badges.
const CHROMA = 0.062;

function hashFor(slug: string): number {
  // FNV-ish rolling hash — cheap, stable, and well spread for short strings.
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function companyInitials(name: string): string {
  const words = name.split(/[\s.&_/-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function CompanyMark({
  slug,
  name,
  size = "sm",
  className,
}: {
  slug: string;
  name: string;
  size?: CompanyMarkSize;
  className?: string;
}) {
  const hash = hashFor(slug);
  const hue = hash % 360;
  const tone = TONE_FLOOR + ((hash % 97) / 96) * TONE_RANGE;
  // A second, independent draw on the light angle so two companies that land
  // on a similar tone still catch the light differently.
  const angle = 110 + (((hash >>> 7) % 5) * 15);

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-mono font-bold leading-none tracking-tight",
        "ring-1 ring-inset ring-white/[0.06]",
        SIZES[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(${angle}deg, oklch(${(tone + 0.09).toFixed(3)} ${CHROMA} ${hue}), oklch(${(tone - 0.05).toFixed(3)} ${CHROMA * 0.85} ${(hue + 34) % 360}))`,
        // Bone initials, not dark ink: inside this tone band white clears
        // 4.5:1 on every hue, including the yellow-green arc where the old
        // brighter tiles could not.
        color: "oklch(0.972 0.004 250)",
      }}
    >
      {companyInitials(name)}
    </span>
  );
}
