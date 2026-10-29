import Image from "next/image";

import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ProductSpotlightPoint = {
  title: string;
  description: string;
};

export type ProductSpotlightProps = {
  heading: string;
  lead?: string;
  points: readonly ProductSpotlightPoint[];
  /** Visual im linken Panel; ohne → Skeleton */
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
};

/** Zwei Panels nebeneinander (Superchat „Ihr KI-Agent …“) */
export function ProductSpotlight({
  heading,
  lead,
  points,
  imageSrc,
  imageAlt,
  className,
}: ProductSpotlightProps) {
  return (
    <SectionFrame className={cn("px-6 py-24 sm:px-10 sm:py-32", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <DisplayHeading className="text-[clamp(1.75rem,3.8vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {heading}
          </DisplayHeading>
          {lead ? (
            <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-[1.7] text-muted-foreground">
              {lead}
            </p>
          ) : null}
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-7 lg:gap-6">
          {/* Linkes Panel — Visual / Mockup */}
          <div className="lg:col-span-4">
            <div className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-sm border border-border bg-card/60 p-4 sm:min-h-[26rem] sm:p-6">
              {imageSrc ? (
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm bg-muted">
                  <Image
                    src={imageSrc}
                    alt={imageAlt ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                  />
                </div>
              ) : (
                <Skeleton
                  className="min-h-0 w-full flex-1 rounded-sm"
                  aria-label="Bild-Platzhalter"
                />
              )}
            </div>
          </div>

          {/* Rechtes Panel — Punkte */}
          <div className="lg:col-span-3">
            <div className="flex h-full min-h-[22rem] flex-col justify-between gap-10 rounded-sm border border-border bg-card/60 p-6 sm:min-h-[26rem] sm:p-8">
              {points.map((point) => (
                <div key={point.title}>
                  <h3 className="font-heading text-lg leading-snug text-foreground sm:text-xl">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-sm leading-[1.65] text-muted-foreground">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
