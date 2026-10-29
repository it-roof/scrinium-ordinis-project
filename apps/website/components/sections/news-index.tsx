import Link from "next/link";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type NewsIndexItem = {
  category: string;
  title: string;
  href?: string;
  date?: string;
};

export type NewsIndexProps = {
  heading?: string;
  items: readonly NewsIndexItem[];
  className?: string;
};

/** News-Index: 2-Spalten-Grid mit Kategorie + Titel (Latest & Greatest) */
export function NewsIndex({
  heading = "Latest & Greatest",
  items,
  className,
}: NewsIndexProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        {heading ? (
          <DisplayHeading className="mb-12 text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
            {heading}
          </DisplayHeading>
        ) : null}

        <ul className="grid gap-0 sm:grid-cols-2">
          {items.map((item, index) => {
            const body = (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <SectionEyebrow>{item.category}</SectionEyebrow>
                  {item.date ? (
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  ) : null}
                </div>
                <DisplayHeading
                  as="h3"
                  className="mt-3 text-[clamp(1.2rem,2.5vw,1.65rem)] leading-snug transition-opacity group-hover:opacity-60"
                >
                  {item.title}
                  <span className="ml-2 text-muted-foreground">↘</span>
                </DisplayHeading>
              </>
            );

            return (
              <li
                key={`${item.category}-${item.title}`}
                className={cn(
                  "border-t border-border py-8 sm:px-6",
                  index % 2 === 0 && "sm:border-r sm:pl-0",
                  index < 2 && "sm:border-t-0 sm:pt-0",
                )}
              >
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
