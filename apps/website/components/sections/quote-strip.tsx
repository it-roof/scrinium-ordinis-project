"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import {
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type QuoteItem = {
  value: string;
  quote: string;
  attribution?: string;
  role?: string;
  /** Portrait; without it a skeleton placeholder is shown */
  imageSrc?: string;
  imageAlt?: string;
};

export type QuoteStripProps = {
  heading: string;
  items: readonly QuoteItem[];
  className?: string;
};

function QuotePortrait({ item }: { item: QuoteItem }) {
  if (item.imageSrc) {
    return (
      <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-muted sm:size-20">
        <Image
          src={item.imageSrc}
          alt={item.imageAlt ?? item.attribution ?? ""}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
    );
  }

  return (
    <Skeleton
      className="size-16 shrink-0 rounded-sm sm:size-20"
      aria-hidden
      aria-label="Foto-Platzhalter"
    />
  );
}

export function QuoteStrip({ heading, items, className }: QuoteStripProps) {
  const [index, setIndex] = useState(0);
  const item = items[index];
  if (!item) return null;

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  return (
    <SectionFrame className={cn(className)}>
      <div className="border-y border-border/70 bg-card/40 px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
            <p className="max-w-xs text-sm font-medium leading-snug text-foreground sm:max-w-sm">
              {heading}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={prev}
                className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
                aria-label="Vorheriges Zitat"
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={next}
                className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
                aria-label="Nächstes Zitat"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </div>

          <article className="mt-10">
            <SectionEyebrow>{item.value}</SectionEyebrow>
            <blockquote className="mt-6 font-heading text-[clamp(1.35rem,3vw,2rem)] leading-snug text-balance text-foreground">
              „{item.quote}“
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <QuotePortrait item={item} />
              <div>
                {item.attribution ? (
                  <p className="text-sm font-medium text-foreground">
                    {item.attribution}
                  </p>
                ) : null}
                {item.role ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.role}</p>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </div>
    </SectionFrame>
  );
}
