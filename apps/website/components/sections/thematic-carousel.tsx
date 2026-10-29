"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type ThematicCarouselItem = {
  client: string;
  title: string;
  href?: string;
  tone?: "warm" | "cool" | "ink" | "soft";
};

export type ThematicCarouselProps = {
  heading: string;
  items: readonly ThematicCarouselItem[];
  className?: string;
};

const toneClass: Record<NonNullable<ThematicCarouselItem["tone"]>, string> = {
  warm: "bg-[color-mix(in_srgb,var(--primary)_28%,var(--background))]",
  cool: "bg-[color-mix(in_srgb,var(--muted-foreground)_18%,var(--background))]",
  ink: "bg-foreground/90",
  soft: "bg-muted",
};

export function ThematicCarousel({
  heading,
  items,
  className,
}: ThematicCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.75, 420), behavior: "smooth" });
  };

  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DisplayHeading className="text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
            {heading}
          </DisplayHeading>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
              aria-label="Vorherige"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
              aria-label="Nächste"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="mt-10 flex gap-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const card = (
              <>
                <div
                  className={cn(
                    "aspect-[16/10] w-full rounded-sm",
                    toneClass[item.tone ?? "soft"],
                  )}
                  aria-hidden
                />
                <SectionEyebrow className="mt-4">{item.client}</SectionEyebrow>
                <DisplayHeading as="h3" className="mt-2 text-lg leading-snug">
                  {item.title}
                </DisplayHeading>
              </>
            );

            return (
              <article
                key={`${item.client}-${item.title}`}
                className="w-[min(85vw,340px)] shrink-0"
              >
                {item.href ? (
                  <Link href={item.href} className="group block">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </article>
            );
          })}
        </div>
      </div>
    </SectionFrame>
  );
}
