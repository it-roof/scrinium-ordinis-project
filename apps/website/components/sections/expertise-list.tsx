import Link from "next/link";

import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type ExpertiseItem = {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

export type ExpertiseListProps = {
  items: readonly ExpertiseItem[];
  className?: string;
};

export function ExpertiseList({ items, className }: ExpertiseListProps) {
  return (
    <SectionFrame className={cn("px-6 py-8 sm:px-10 sm:py-12", className)}>
      <div className="mx-auto max-w-4xl">
        <ul>
          {items.map((item, index) => (
            <li key={item.title} className="py-14 sm:py-20">
              {index > 0 ? (
                <Hairline className="mb-14 bg-border/70 sm:mb-20" />
              ) : null}
              <DisplayHeading
                as="h2"
                className="text-[clamp(1.85rem,4.5vw,3rem)] leading-[1.08] tracking-[-0.02em] text-muted-foreground/70 uppercase"
              >
                {item.title}
              </DisplayHeading>
              <p className="mt-5 max-w-2xl text-[0.95rem] leading-[1.7] text-muted-foreground sm:text-base">
                {item.description}
              </p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="mt-8 inline-block text-xs font-medium tracking-[0.12em] text-foreground/70 uppercase underline-offset-4 transition-opacity hover:opacity-50 hover:underline"
                >
                  {item.linkLabel ?? "Mehr"} ↘
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </SectionFrame>
  );
}
