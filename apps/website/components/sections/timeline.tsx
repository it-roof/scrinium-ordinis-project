"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRef } from "react";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  year: string;
  title: string;
  description?: string;
  badge?: string;
};

export type TimelineProps = {
  heading: string;
  lead?: string;
  items: readonly TimelineItem[];
  /** horizontal = AKQA-Scroller; vertical = Liste untereinander */
  layout?: "horizontal" | "vertical";
  className?: string;
};

export function Timeline({
  heading,
  lead,
  items,
  layout = "horizontal",
  className,
}: TimelineProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const vertical = layout === "vertical";

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(el.clientWidth * 0.7, 360),
      behavior: "smooth",
    });
  };

  return (
    <SectionFrame className={cn("px-6 py-28 sm:px-10 sm:py-36", className)}>
      <div className="mx-auto max-w-6xl">
        <div
          className={cn(
            "flex flex-wrap gap-6",
            vertical ? "items-start" : "items-end justify-between",
          )}
        >
          <div className="max-w-2xl">
            <DisplayHeading className="text-[clamp(1.85rem,4.5vw,3rem)] tracking-[-0.02em] text-muted-foreground/70 uppercase">
              {heading}
            </DisplayHeading>
            {lead ? (
              <p className="mt-5 max-w-lg text-[0.95rem] leading-[1.7] text-muted-foreground sm:text-base">
                {lead}
              </p>
            ) : null}
          </div>
          {!vertical ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                className="flex size-9 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted"
                aria-label="Vorherige"
              >
                <ChevronLeftIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                className="flex size-9 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted"
                aria-label="Nächste"
              >
                <ChevronRightIcon className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {vertical ? (
          <ol className="mt-14 border-t border-border/70">
            {items.map((item) => (
              <li
                key={`${item.year}-${item.title}`}
                className="grid gap-3 border-b border-border/70 py-8 sm:grid-cols-[5.5rem_1fr] sm:gap-10 sm:py-9"
              >
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-start sm:gap-2">
                  <SectionEyebrow className="text-muted-foreground/70">
                    {item.year}
                  </SectionEyebrow>
                  {item.badge ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <div className="max-w-2xl">
                  <DisplayHeading
                    as="h3"
                    className="text-lg leading-snug tracking-tight uppercase sm:text-xl"
                  >
                    {item.title}
                  </DisplayHeading>
                  {item.description ? (
                    <p className="mt-3 text-sm leading-[1.7] text-muted-foreground sm:text-[0.95rem]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div
            ref={scrollerRef}
            className="mt-16 flex gap-8 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <article
                key={`${item.year}-${item.title}`}
                className="w-[min(78vw,260px)] shrink-0 border-t border-border/70 pt-7"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SectionEyebrow className="text-muted-foreground/70">
                    {item.year}
                  </SectionEyebrow>
                  {item.badge ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <DisplayHeading
                  as="h3"
                  className="mt-5 text-lg leading-snug tracking-tight uppercase"
                >
                  {item.title}
                </DisplayHeading>
                {item.description ? (
                  <p className="mt-3 text-sm leading-[1.65] text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </SectionFrame>
  );
}
