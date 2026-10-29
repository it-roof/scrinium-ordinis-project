import Link from "next/link";

import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type PerspectiveIndexItem = {
  title: string;
  deck?: string;
  href?: string;
};

export type PerspectiveIndexProps = {
  items: readonly PerspectiveIndexItem[];
  className?: string;
};

/** Perspectives-Index: gestapelte Editorial-Titel mit optionalem Deck */
export function PerspectiveIndex({ items, className }: PerspectiveIndexProps) {
  return (
    <SectionFrame className={cn("px-6 py-10 sm:px-10 sm:py-16", className)}>
      <div className="mx-auto max-w-5xl">
        <ul>
          {items.map((item, index) => {
            const body = (
              <>
                <DisplayHeading
                  as="h2"
                  className="text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight transition-opacity group-hover:opacity-60"
                >
                  {item.title}
                </DisplayHeading>
                {item.deck ? (
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {item.deck}
                  </p>
                ) : null}
              </>
            );

            return (
              <li key={item.title} className="py-10 sm:py-14">
                {index > 0 ? <Hairline className="mb-10 sm:mb-14" /> : null}
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
