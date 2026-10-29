"use client";

import { useState } from "react";

import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqListProps = {
  heading?: string;
  items: readonly FaqItem[];
  className?: string;
};

export function FaqList({
  heading = "Fragen",
  items,
  className,
}: FaqListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SectionFrame className={cn("px-6 py-28 sm:px-10 sm:py-36", className)}>
      <div className="mx-auto max-w-3xl">
        <DisplayHeading className="text-[clamp(1.85rem,4.5vw,3rem)] tracking-[-0.02em] text-muted-foreground/70 uppercase">
          {heading}
        </DisplayHeading>
        <Hairline className="mt-10 max-w-[7rem] bg-border/70" />

        <ul className="mt-12 divide-y divide-border/70 border-y border-border/70">
          {items.map((item, index) => {
            const open = openIndex === index;
            return (
              <li key={item.question}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-start justify-between gap-6 py-6 text-left transition-opacity hover:opacity-70"
                >
                  <span className="font-heading text-[clamp(1.05rem,2vw,1.25rem)] leading-snug text-foreground">
                    {item.question}
                  </span>
                  <span
                    className="mt-1 shrink-0 text-sm text-muted-foreground"
                    aria-hidden
                  >
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open ? (
                  <p className="pb-7 text-[0.95rem] leading-[1.7] text-muted-foreground">
                    {item.answer}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </SectionFrame>
  );
}
