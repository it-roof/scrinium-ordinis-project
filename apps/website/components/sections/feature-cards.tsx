import Image from "next/image";

import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type FeatureCardItem = {
  title: string;
  description: string;
  /** Optional visual; without it a skeleton placeholder is shown */
  imageSrc?: string;
  imageAlt?: string;
};

export type FeatureCardsProps = {
  heading: string;
  lead?: string;
  items: readonly FeatureCardItem[];
  className?: string;
};

function CardVisual({ item }: { item: FeatureCardItem }) {
  if (item.imageSrc) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-muted">
        <Image
          src={item.imageSrc}
          alt={item.imageAlt ?? item.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    );
  }

  return (
    <Skeleton
      className="aspect-[16/10] w-full rounded-sm"
      aria-hidden
      aria-label="Bild-Platzhalter"
    />
  );
}

/** Feature-Grid mit Visuals (Superchat „WhatsApp für Kundenservice …“) */
export function FeatureCards({
  heading,
  lead,
  items,
  className,
}: FeatureCardsProps) {
  return (
    <SectionFrame className={cn("px-6 py-24 sm:px-10 sm:py-32", className)}>
      <div className="mx-auto max-w-6xl">
        <DisplayHeading className="max-w-2xl text-[clamp(1.75rem,3.8vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
          {heading}
        </DisplayHeading>
        {lead ? (
          <p className="mt-5 max-w-xl text-[1rem] leading-[1.7] text-muted-foreground">
            {lead}
          </p>
        ) : null}

        <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
          {items.map((item) => (
            <li key={item.title} className="flex flex-col">
              <CardVisual item={item} />
              <h3 className="mt-5 font-heading text-lg leading-snug text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-[1.65] text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </SectionFrame>
  );
}
