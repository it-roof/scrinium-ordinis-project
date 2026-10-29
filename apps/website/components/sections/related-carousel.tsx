"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type RelatedCarouselItem = {
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
};

export type RelatedCarouselProps = {
  heading: string;
  items: readonly RelatedCarouselItem[];
  className?: string;
};

/** Horizontales Produkt-Carousel (Superchat „Kommunikation für aufstrebende Unternehmen“) */
export function RelatedCarousel({
  heading,
  items,
  className,
}: RelatedCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(el.clientWidth * 0.7, 380),
      behavior: "smooth",
    });
  };

  return (
    <SectionFrame className={cn("px-6 py-20 sm:px-10 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DisplayHeading className="max-w-xl text-[clamp(1.75rem,3.8vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
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
          className="mt-10 flex gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6"
        >
          {items.map((item) => {
            const body = (
              <>
                {item.imageSrc ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-muted">
                    <Image
                      src={item.imageSrc}
                      alt={item.imageAlt ?? item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="352px"
                    />
                  </div>
                ) : (
                  <Skeleton
                    className="aspect-[4/3] w-full rounded-sm"
                    aria-label="Bild-Platzhalter"
                  />
                )}
                <h3 className="mt-5 font-heading text-lg leading-snug text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-[1.65] text-muted-foreground">
                  {item.description}
                </p>
                <span className="mt-4 inline-block text-xs font-medium tracking-[0.14em] text-foreground uppercase underline-offset-4 group-hover:underline">
                  {item.ctaLabel ?? "Mehr dazu"} ↘
                </span>
              </>
            );

            const classNameCard =
              "group flex w-[min(85vw,22rem)] shrink-0 flex-col";

            return item.href ? (
              <Link key={item.title} href={item.href} className={classNameCard}>
                {body}
              </Link>
            ) : (
              <article key={item.title} className={classNameCard}>
                {body}
              </article>
            );
          })}
        </div>
      </div>
    </SectionFrame>
  );
}
