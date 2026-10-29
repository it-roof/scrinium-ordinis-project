import Image from "next/image";
import Link from "next/link";

import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type FinalCtaImage = {
  src?: string;
  alt?: string;
};

export type FinalCtaProps = {
  heading: string;
  lead: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  /** 3 Bilder: [0] hoch links, [1] oben rechts, [2] unten rechts */
  images?: readonly FinalCtaImage[];
  className?: string;
};

function CollageCell({
  image,
  className,
}: {
  image?: FinalCtaImage;
  className?: string;
}) {
  if (image?.src) {
    return (
      <div className={cn("relative overflow-hidden rounded-sm bg-muted", className)}>
        <Image
          src={image.src}
          alt={image.alt ?? ""}
          fill
          className="object-cover"
          sizes="(max-width: 1280px) 50vw, 30vw"
        />
      </div>
    );
  }

  return (
    <Skeleton
      className={cn("size-full rounded-sm", className)}
      aria-label="Bild-Platzhalter"
    />
  );
}

/** Abschluss-CTA mit 3er-Collage (Superchat „Kundenkommunikation neu gedacht“) */
export function FinalCta({
  heading,
  lead,
  primaryCta,
  secondaryCta,
  images = [{}, {}, {}],
  className,
}: FinalCtaProps) {
  const [tall, topRight, bottomRight] = [
    images[0] ?? {},
    images[1] ?? {},
    images[2] ?? {},
  ];

  return (
    <SectionFrame className={cn("px-6 py-20 sm:px-10 sm:py-28", className)}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 xl:grid-cols-[1fr_1.15fr] xl:gap-16">
        <div>
          <DisplayHeading className="max-w-md text-[clamp(1.85rem,4vw,3rem)] leading-[1.08] tracking-[-0.025em]">
            {heading}
          </DisplayHeading>
          <p className="mt-5 max-w-md text-[1rem] leading-[1.7] text-muted-foreground">
            {lead}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
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

        <div
          className="grid aspect-[5/4] grid-cols-2 grid-rows-2 gap-3 sm:gap-4 xl:aspect-auto xl:min-h-[22rem]"
          aria-label="Bildcollage"
        >
          <CollageCell image={tall} className="row-span-2 min-h-0" />
          <CollageCell image={topRight} className="min-h-0" />
          <CollageCell image={bottomRight} className="min-h-0" />
        </div>
      </div>
    </SectionFrame>
  );
}
