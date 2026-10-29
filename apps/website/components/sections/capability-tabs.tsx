"use client";

import Link from "next/link";
import { useState } from "react";

import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type CapabilityTab = {
  id: string;
  label: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

export type CapabilityTabsProps = {
  items: readonly CapabilityTab[];
  className?: string;
};

export function CapabilityTabs({ items, className }: CapabilityTabsProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const active = items.find((item) => item.id === activeId) ?? items[0];

  if (!active) return null;

  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <div
          role="tablist"
          aria-label="Leistungen"
          className="flex flex-wrap gap-2 border-b border-border pb-4"
        >
          {items.map((item) => {
            const isActive = item.id === active.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium tracking-wide transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="pt-12">
          <DisplayHeading className="max-w-4xl text-[clamp(1.75rem,5vw,3.25rem)] leading-[1.05] uppercase">
            {active.title}
          </DisplayHeading>
          <Hairline className="mt-8 max-w-xs" />
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {active.description}
          </p>
          {active.href ? (
            <Link
              href={active.href}
              className="mt-8 inline-block text-sm font-medium tracking-wide underline-offset-4 hover:underline"
            >
              {active.linkLabel ?? "Mehr erfahren"} ↘
            </Link>
          ) : null}
        </div>
      </div>
    </SectionFrame>
  );
}
