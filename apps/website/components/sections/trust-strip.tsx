import { SectionFrame } from "@/components/sections/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type TrustLogo = {
  name: string;
  /** Optional logo image; without it a skeleton placeholder is shown */
  src?: string;
  /** Optional link — opens in a new tab */
  href?: string;
};

export type TrustStripProps = {
  lead: string;
  /** @deprecated Prefer `logos` — text chips become logo placeholders */
  items?: readonly string[];
  logos?: readonly TrustLogo[];
  className?: string;
};

const SKELETON_WIDTHS = [
  "w-20",
  "w-24",
  "w-16",
  "w-28",
  "w-32",
  "w-20",
  "w-24",
  "w-16",
] as const;

/** Trust-Bar: Lead + rotierende Firmen-Logos (Skeleton bis echte Assets da sind) */
export function TrustStrip({ lead, items, logos, className }: TrustStripProps) {
  const resolved: TrustLogo[] =
    logos?.length ?
      [...logos]
    : (items ?? []).map((name) => ({ name }));

  if (resolved.length === 0) return null;

  // Rotation/Marquee vorerst aus — erst wieder aktivieren, wenn mehrere Logos da sind.
  // const track = [...resolved, ...resolved];
  const track = resolved;

  return (
    <SectionFrame
      className={cn(
        "overflow-hidden border-y border-border/70 bg-card/40 px-6 py-8 sm:px-10",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        <p className="shrink-0 max-w-[12rem] text-sm font-medium leading-snug text-foreground sm:max-w-[14rem]">
          {lead}
        </p>

        <div className="relative min-w-0 flex-1">
          {/* className "trust-logo-track" + Maske wieder aktivieren für Marquee */}
          <ul
            className="flex w-max items-center gap-10 py-1 sm:gap-14"
            aria-label="Referenz-Kanzleien und Unternehmen"
          >
            {track.map((logo, index) => {
              const widthClass =
                SKELETON_WIDTHS[index % SKELETON_WIDTHS.length] ?? "w-20";
              return (
                <li
                  key={`${logo.name}-${index}`}
                  className="flex h-9 shrink-0 items-center"
                >
                  {logo.src ? (
                    logo.href ? (
                      <a
                        href={logo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-opacity hover:opacity-100"
                        aria-label={`${logo.name} — Website öffnen`}
                      >
                        <img
                          src={logo.src}
                          alt={logo.name}
                          className="h-8 w-auto max-w-[13rem] object-contain opacity-70 grayscale dark:invert dark:opacity-85 sm:h-9 sm:max-w-[15rem]"
                        />
                      </a>
                    ) : (
                      <img
                        src={logo.src}
                        alt={logo.name}
                        className="h-8 w-auto max-w-[13rem] object-contain opacity-70 grayscale dark:invert dark:opacity-85 sm:h-9 sm:max-w-[15rem]"
                      />
                    )
                  ) : (
                    <Skeleton
                      className={cn("h-5 rounded-sm", widthClass)}
                      aria-label={`Logo-Platzhalter ${logo.name}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </SectionFrame>
  );
}
