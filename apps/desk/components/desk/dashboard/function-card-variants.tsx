"use client";

import {
  IconArrowRight,
  IconMessages,
  IconPlus,
  type Icon,
} from "@tabler/icons-react";
import { Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type DashboardFunctionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const FUNCTION_ICONS: Record<string, Icon | LucideIcon> = {
  prompts: Sparkles,
  "staff-messages": IconPlus,
  inbox: IconMessages,
};

/** A — Klassische Karte mit Icon-Well */
function VariantA({ items }: { items: DashboardFunctionItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = FUNCTION_ICONS[item.id] ?? Sparkles;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group relative rounded-xl border border-border/80 bg-card px-5 py-5 transition-colors hover:bg-muted/40"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted ring-1 ring-border/60">
              <Icon className="size-4 text-foreground/80" />
            </div>
            <p className="font-heading text-base font-medium tracking-tight">
              {item.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            <IconArrowRight className="absolute top-5 right-5 size-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

/** B — Kompakte Zeile: Icon links, Text rechts */
function VariantB({ items }: { items: DashboardFunctionItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = FUNCTION_ICONS[item.id] ?? Sparkles;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-start gap-4 rounded-xl border border-border/80 bg-card px-4 py-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="size-4 text-foreground/75" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-base font-medium tracking-tight">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
            <IconArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

/** C — Vertieft / Mulde ohne Rahmen */
function VariantC({ items }: { items: DashboardFunctionItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = FUNCTION_ICONS[item.id] ?? Sparkles;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group rounded-xl bg-muted/55 px-5 py-5 ring-1 ring-border/50 transition-colors hover:bg-muted/80"
          >
            <Icon className="mb-3 size-5 text-foreground/70" />
            <p className="font-heading text-base font-medium tracking-tight">
              {item.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

/** D — Editorial: Titel + Linie, Icon rechts */
function VariantD({ items }: { items: DashboardFunctionItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = FUNCTION_ICONS[item.id] ?? Sparkles;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group border-b border-border/80 pb-4 transition-colors hover:border-foreground/35"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-heading text-lg font-medium tracking-tight">
                {item.title}
              </p>
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground/55" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

const VARIANTS = [
  {
    id: "A",
    title: "Klassische Karte",
    description: "Rahmen, Icon-Well, ruhiger Pfeil — klar und vertraut.",
    Component: VariantA,
  },
  {
    id: "B",
    title: "Kompakte Zeile",
    description: "Icon links, Inhalt rechts — dicht und professionell.",
    Component: VariantB,
  },
  {
    id: "C",
    title: "Vertiefte Mulde",
    description: "Weiches Feld ohne starken Rahmen — taktil und ruhig.",
    Component: VariantC,
  },
  {
    id: "D",
    title: "Editorial",
    description: "Typografie und Linie — reduziert, seriös.",
    Component: VariantD,
  },
] as const;

/**
 * Temporärer Vergleich: vier Premium-Karten-Varianten untereinander.
 */
export function FunctionCardVariants({
  items,
}: {
  items: DashboardFunctionItem[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {VARIANTS.map(({ id, title, description, Component }) => (
        <section key={id} className="space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-sm font-medium tracking-tight">
              Karte {id}
            </span>
            <span className="text-sm text-muted-foreground">· {title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
          <Component items={items} />
        </section>
      ))}
    </div>
  );
}
