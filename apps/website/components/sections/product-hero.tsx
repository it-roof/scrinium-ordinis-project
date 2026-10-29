import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type ProductHeroCard = {
  label: string;
  text: string;
};

export type ProductHeroProps = {
  eyebrow?: string;
  title: string;
  lead: ReactNode;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  imageSrc: string;
  imageAlt: string;
  floatCards?: readonly ProductHeroCard[];
  className?: string;
};

/** Superchat-Produkt-Hero: Copy + Visual, AKQA-Typografie */
export function ProductHero({
  eyebrow,
  title,
  lead,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt,
  floatCards = [],
  className,
}: ProductHeroProps) {
  return (
    <SectionFrame className={cn("px-6 pb-16 pt-28 sm:px-10 sm:pb-24 sm:pt-32", className)}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          {eyebrow ? <SectionEyebrow className="mb-5">{eyebrow}</SectionEyebrow> : null}
          <DisplayHeading
            as="h1"
            className="text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.025em] text-foreground"
          >
            {title}
          </DisplayHeading>
          <p className="mt-6 max-w-md text-[1.05rem] leading-[1.65] text-muted-foreground sm:text-lg">
            {lead}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href={primaryCta.href}
              className="inline-flex min-h-12 items-center rounded-full bg-foreground px-7 text-xs font-semibold tracking-[0.12em] text-background uppercase transition-opacity hover:opacity-85"
            >
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex min-h-12 items-center rounded-full border border-border px-7 text-xs font-semibold tracking-[0.12em] text-foreground uppercase transition-colors hover:bg-muted"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted shadow-[var(--shadow-soft)] sm:aspect-[4/5]">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              priority
              className="object-cover object-[55%_40%]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/25 via-transparent to-transparent"
            />
          </div>
          {floatCards.map((card, index) => (
            <div
              key={card.label}
              className={cn(
                "absolute max-w-[15rem] border border-border/70 bg-card/97 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md",
                index === 0 && "-left-1 top-10 sm:-left-8 sm:top-14",
                index === 1 && "-right-1 top-[42%] sm:-right-6",
                index === 2 && "left-3 bottom-5 sm:left-6 sm:bottom-8",
              )}
            >
              <p className="text-[0.65rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {card.label}
              </p>
              <p className="mt-2 text-sm leading-snug text-foreground">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
