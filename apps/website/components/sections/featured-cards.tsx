import Link from "next/link";

import {
  DisplayHeading,
  Hairline,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type FeaturedCard = {
  eyebrow: string;
  title: string;
  href?: string;
};

export type FeaturedCardsProps = {
  heading?: string;
  items: readonly FeaturedCard[];
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
};

export function FeaturedCards({
  heading,
  items,
  viewAllHref,
  viewAllLabel = "Alle ansehen",
  className,
}: FeaturedCardsProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        {heading ? (
          <DisplayHeading className="mb-10 text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
            {heading}
          </DisplayHeading>
        ) : null}

        <div className="grid gap-0 md:grid-cols-2">
          {items.map((item, index) => {
            const content = (
              <>
                <SectionEyebrow>{item.eyebrow}</SectionEyebrow>
                <DisplayHeading
                  as="h3"
                  className="mt-4 text-[clamp(1.35rem,2.8vw,1.85rem)] leading-snug"
                >
                  {item.title}
                  <span className="ml-2 inline-block text-muted-foreground transition-transform group-hover:translate-x-1">
                    ↘
                  </span>
                </DisplayHeading>
              </>
            );

            return (
              <div
                key={`${item.eyebrow}-${item.title}`}
                className={cn(
                  "border-t border-border py-8 md:px-6",
                  index % 2 === 0 ? "md:border-r" : "",
                  index < 2 ? "md:border-t-0 md:pt-0" : "",
                )}
              >
                {item.href ? (
                  <Link href={item.href} className="group block">
                    {content}
                  </Link>
                ) : (
                  <div className="group">{content}</div>
                )}
              </div>
            );
          })}
        </div>

        {viewAllHref ? (
          <>
            <Hairline className="mt-8" />
            <div className="pt-6">
              <Link
                href={viewAllHref}
                className="text-sm font-medium tracking-wide text-foreground underline-offset-4 hover:underline"
              >
                {viewAllLabel} ↘
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </SectionFrame>
  );
}
