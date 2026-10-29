import Link from "next/link";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type LandingHeroProps = {
  eyebrow?: string;
  lines: readonly string[];
  lead: string;
  /** Konkrete Ergebnis-Bullets unter dem Lead */
  bullets?: readonly string[];
  trustLine?: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  tone?: "soft" | "bold";
  className?: string;
};

export function LandingHero({
  eyebrow,
  lines,
  lead,
  bullets = [],
  trustLine,
  primaryCta,
  secondaryCta,
  tone = "bold",
  className,
}: LandingHeroProps) {
  return (
    <SectionFrame
      className={cn(
        "flex min-h-[85svh] items-center px-6 py-24 sm:px-10 sm:py-28",
        className,
      )}
    >
      <div className="mr-auto w-full max-w-[46rem] lg:max-w-[52rem] lg:pl-6 xl:pl-10">
        {eyebrow ? <SectionEyebrow className="mb-6">{eyebrow}</SectionEyebrow> : null}

        <DisplayHeading
          as="h1"
          className={cn(
            "text-[clamp(2.1rem,5.8vw,3.75rem)] leading-[1.05] tracking-[-0.02em] uppercase",
            tone === "soft" ? "text-foreground/40" : "text-foreground",
          )}
        >
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </DisplayHeading>

        <p className="mt-8 max-w-xl text-[1.05rem] leading-[1.65] text-foreground/90 sm:text-lg">
          {lead}
        </p>

        {bullets.length > 0 ? (
          <ul className="mt-8 max-w-xl space-y-3 border-l border-border pl-5">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="text-[0.95rem] leading-snug text-muted-foreground"
              >
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href={primaryCta.href}
            className="inline-flex min-h-12 items-center rounded-full bg-foreground px-7 text-xs font-semibold tracking-[0.12em] text-background uppercase transition-opacity hover:opacity-85"
          >
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="text-xs font-medium tracking-[0.12em] text-foreground/75 uppercase underline-offset-4 transition-opacity hover:opacity-55 hover:underline"
            >
              {secondaryCta.label} ↘
            </Link>
          ) : null}
        </div>

        {trustLine ? (
          <p className="mt-8 text-xs leading-relaxed tracking-wide text-muted-foreground">
            {trustLine}
          </p>
        ) : null}
      </div>
    </SectionFrame>
  );
}
