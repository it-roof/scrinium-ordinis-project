import Link from "next/link";

import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type OutcomeItem = {
  title: string;
  detail: string;
};

export type OutcomeListProps = {
  heading: string;
  lead?: string;
  items: readonly OutcomeItem[];
  cta?: { href: string; label: string };
  className?: string;
};

/** Greifbare Ergebnisse — „was liegt danach auf dem Tisch“ */
export function OutcomeList({
  heading,
  lead,
  items,
  cta,
  className,
}: OutcomeListProps) {
  return (
    <SectionFrame className={cn("px-6 py-24 sm:px-10 sm:py-32", className)}>
      <div className="mx-auto max-w-4xl">
        <DisplayHeading className="text-[clamp(1.75rem,4vw,2.75rem)] tracking-[-0.02em] text-foreground uppercase">
          {heading}
        </DisplayHeading>
        {lead ? (
          <p className="mt-5 max-w-2xl text-[1.05rem] leading-[1.65] text-muted-foreground">
            {lead}
          </p>
        ) : null}
        <Hairline className="mt-10 max-w-[7rem] bg-border/80" />

        <ol className="mt-12 space-y-0 border-t border-border/70">
          {items.map((item, index) => (
            <li
              key={item.title}
              className="grid gap-3 border-b border-border/70 py-7 sm:grid-cols-[3rem_1fr] sm:gap-8"
            >
              <span className="text-xs font-medium tracking-[0.16em] text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-heading text-[clamp(1.15rem,2.2vw,1.4rem)] leading-snug text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.65] text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {cta ? (
          <div className="mt-12">
            <Link
              href={cta.href}
              className="inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-xs font-medium tracking-[0.14em] text-background uppercase transition-opacity hover:opacity-80"
            >
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </SectionFrame>
  );
}
