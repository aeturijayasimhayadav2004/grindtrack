import { cn } from "@/lib/utils";

/**
 * Generated identity tile for a company.
 *
 * There are no logo assets in the dataset and fetching them from a third party
 * would leak which companies you browse, so each mark is derived from the slug
 * instead: same company always gets the same hue, and 656 of them spread evenly
 * around the wheel.
 */

const SIZES = {
  sm: "size-6 rounded-md text-[9px]",
  md: "size-9 rounded-lg text-[12px]",
  lg: "size-14 rounded-xl text-[19px]",
} as const;

export type CompanyMarkSize = keyof typeof SIZES;

function hueFor(slug: string): number {
  // FNV-ish rolling hash — cheap, stable, and well spread for short strings.
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
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
  const hue = hueFor(slug);

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-mono font-bold leading-none tracking-tight",
        SIZES[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(140deg, oklch(0.78 0.16 ${hue}), oklch(0.58 0.2 ${
          (hue + 48) % 360
        }))`,
        // Dark ink rather than white: at these chroma levels white drops below
        // 4.5:1 on the yellow/lime part of the wheel, dark ink never does.
        color: `oklch(0.21 0.06 ${hue})`,
      }}
    >
      {companyInitials(name)}
    </span>
  );
}
