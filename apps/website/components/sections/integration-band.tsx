import Image from "next/image";
import Link from "next/link";

import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type IntegrationBandProps = {
  heading: string;
  lead: string;
  cta: { href: string; label: string };
  /** Left visual; without it a skeleton placeholder is shown */
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
};

/** Split-Band mit Visual + CTA (Superchat „Automatisierungen mit 5000+ Integrationen“) */
export function IntegrationBand({
  heading,
  lead,
  cta,
  imageSrc,
  imageAlt,
  className,
}: IntegrationBandProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl overflow-hidden rounded-sm border border-border bg-card/70 lg:flex lg:items-stretch">
        <div className="relative min-h-[14rem] w-full bg-muted/40 lg:min-h-[22rem] lg:w-1/2">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt ?? ""}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 grid grid-cols-3 gap-3 p-6 sm:gap-4 sm:p-8">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-square w-full rounded-sm"
                  aria-hidden
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:w-1/2 lg:px-14">
          <DisplayHeading className="text-[clamp(1.5rem,3.2vw,2.35rem)] leading-[1.15] tracking-[-0.02em]">
            {heading}
          </DisplayHeading>
          <p className="mt-4 max-w-md text-[0.95rem] leading-[1.7] text-muted-foreground sm:text-[1.05rem]">
            {lead}
          </p>
          <div className="mt-8 sm:mt-10">
            <Link
              href={cta.href}
              className="inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-xs font-medium tracking-[0.14em] text-background uppercase transition-opacity hover:opacity-80"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
