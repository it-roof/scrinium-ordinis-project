import Link from "next/link";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type EditorialItem = {
  category: string;
  title: string;
  href?: string;
};

export type EditorialListProps = {
  heading: string;
  items: readonly EditorialItem[];
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
};

export function EditorialList({
  heading,
  items,
  viewAllHref,
  viewAllLabel = "Alle Beiträge",
  className,
}: EditorialListProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DisplayHeading className="text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
            {heading}
          </DisplayHeading>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-sm font-medium tracking-wide underline-offset-4 hover:underline"
            >
              {viewAllLabel} ↘
            </Link>
          ) : null}
        </div>

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {items.map((item) => {
            const body = (
              <div className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:gap-8">
                <SectionEyebrow className="sm:w-36 shrink-0">{item.category}</SectionEyebrow>
                <DisplayHeading
                  as="h3"
                  className="flex-1 text-[clamp(1.15rem,2.4vw,1.5rem)] leading-snug"
                >
                  {item.title}
                  <span className="ml-2 text-muted-foreground transition-transform group-hover:translate-x-1">
                    ↘
                  </span>
                </DisplayHeading>
              </div>
            );

            return (
              <li key={`${item.category}-${item.title}`}>
                {item.href ? (
                  <Link href={item.href} className="group block">
                    {body}
                  </Link>
                ) : (
                  <div className="group">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </SectionFrame>
  );
}
