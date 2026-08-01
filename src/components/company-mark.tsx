import { cn } from "@/lib/utils";

/**
 * Generated identity tile for a company.
 *
 * There are no logo assets in the dataset and fetching them from a third party
 * would leak which companies you browse, so each mark is derived from the slug
 * instead: same company always gets the same tile, every time.
 *
 * This used to spread 656 companies around the full hue wheel, which made the
 * sidebar the loudest surface in the app. The marks now vary on luminance
 * within a single graphite hue — still enough separation to navigate by shape
 * and weight, without turning the rail into a paint chart.
 */

const SIZES = {
  sm: "size-6 rounded-md text-[9px]",
  md: "size-9 rounded-lg text-[12px]",
  lg: "size-14 rounded-xl text-[19px]",
} as const;

export type CompanyMarkSize = keyof typeof SIZES;

// The single hue the whole interface is built on.
const HUE = 250;
// Tiles stay in a mid band: dark enough that bone initials clear 4.5:1, light
// enough to read as a raised chip on the near-black background.
const TONE_FLOOR = 0.34;
const TONE_RANGE = 0.16;

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
        backgroundImage: `linear-gradient(${angle}deg, oklch(${(tone + 0.09).toFixed(3)} 0.007 ${HUE}), oklch(${(tone - 0.05).toFixed(3)} 0.006 ${HUE}))`,
        // Bone on a mid-graphite chip clears 4.5:1 across the whole tone band.
        color: "oklch(0.968 0.003 250)",
      }}
    >
      {companyInitials(name)}
    </span>
  );
}
