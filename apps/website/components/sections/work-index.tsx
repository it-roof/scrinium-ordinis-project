import Link from "next/link";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type WorkIndexItem = {
  client: string;
  title: string;
  href?: string;
  /** Optionaler Farbton für Media-Platzhalter */
  tone?: "warm" | "cool" | "ink" | "soft";
};

export type WorkIndexProps = {
  heading?: string;
  items: readonly WorkIndexItem[];
  className?: string;
};

const toneClass: Record<NonNullable<WorkIndexItem["tone"]>, string> = {
  warm: "bg-[color-mix(in_srgb,var(--primary)_28%,var(--background))]",
  cool: "bg-[color-mix(in_srgb,var(--muted-foreground)_18%,var(--background))]",
  ink: "bg-foreground/90",
  soft: "bg-muted",
};

export function WorkIndex({ heading, items, className }: WorkIndexProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        {heading ? (
          <DisplayHeading className="mb-12 text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
            {heading}
          </DisplayHeading>
        ) : null}

        <ul className="grid gap-10 sm:grid-cols-2 lg:gap-x-8 lg:gap-y-14">
          {items.map((item) => {
            const media = (
              <div
                className={cn(
                  "aspect-[4/3] w-full overflow-hidden rounded-sm transition-transform duration-500 group-hover:scale-[1.02]",
                  toneClass[item.tone ?? "soft"],
                )}
                aria-hidden
              />
            );

            const copy = (
              <div className="mt-4">
                <SectionEyebrow>{item.client}</SectionEyebrow>
                <DisplayHeading
                  as="h3"
                  className="mt-2 text-[clamp(1.15rem,2.2vw,1.45rem)] leading-snug"
                >
                  {item.title}
                </DisplayHeading>
              </div>
            );

            return (
              <li key={`${item.client}-${item.title}`}>
                {item.href ? (
                  <Link href={item.href} className="group block">
                    {media}
                    {copy}
                  </Link>
                ) : (
                  <div className="group">
                    {media}
                    {copy}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </SectionFrame>
  );
}
