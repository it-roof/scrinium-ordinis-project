import Image from "next/image";
import Link from "next/link";

import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type FeatureRowItem = {
  title: string;
  body: string;
  points?: readonly string[];
  imageSrc?: string;
  imageAlt?: string;
  cta?: { href: string; label: string };
};

export type FeatureRowsProps = {
  items: readonly FeatureRowItem[];
  className?: string;
};

/** Alternierende Feature-Blöcke (Superchat-Produktseite → AKQA-Whitespace) */
export function FeatureRows({ items, className }: FeatureRowsProps) {
  return (
    <SectionFrame className={cn("px-6 py-8 sm:px-10 sm:py-12", className)}>
      <div className="mx-auto max-w-6xl space-y-24 sm:space-y-32">
        {items.map((item, index) => {
          const reverse = index % 2 === 1;
          return (
            <article
              key={item.title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <div className={cn(reverse && "lg:order-2")}>
                <DisplayHeading className="text-[clamp(1.75rem,3.8vw,2.75rem)] leading-[1.1] tracking-[-0.02em] text-foreground">
                  {item.title}
                </DisplayHeading>
                <p className="mt-5 max-w-md text-[1rem] leading-[1.7] text-muted-foreground">
                  {item.body}
                </p>
                {item.points && item.points.length > 0 ? (
                  <ul className="mt-6 space-y-3 border-l border-border pl-5">
                    {item.points.map((point) => (
                      <li
                        key={point}
                        className="text-sm leading-snug text-foreground/85"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {item.cta ? (
                  <Link
                    href={item.cta.href}
                    className="mt-8 inline-block text-xs font-medium tracking-[0.14em] text-foreground uppercase underline-offset-4 hover:underline"
                  >
                    {item.cta.label} ↘
                  </Link>
                ) : null}
              </div>

              <div className={cn(reverse && "lg:order-1")}>
                {item.imageSrc ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-muted shadow-[var(--shadow-soft)]">
                    <Image
                      src={item.imageSrc}
                      alt={item.imageAlt ?? ""}
                      fill
                      className="object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden
                    className="aspect-[4/3] rounded-sm bg-[color-mix(in_srgb,var(--primary)_14%,var(--background))]"
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </SectionFrame>
  );
}
