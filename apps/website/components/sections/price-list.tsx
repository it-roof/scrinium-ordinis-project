import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type PriceListItem = {
  label: string;
  detail?: string;
  price: string;
  note?: string;
};

export type PriceListProps = {
  eyebrow?: string;
  heading: string;
  lead?: string;
  items: readonly PriceListItem[];
  footnotes?: readonly string[];
  className?: string;
};

/** Statische Preisliste — Detailzeilen ohne Kalkulator */
export function PriceList({
  eyebrow,
  heading,
  lead,
  items,
  footnotes = [],
  className,
}: PriceListProps) {
  return (
    <SectionFrame className={cn("px-6 py-12 sm:px-10 sm:py-16", className)}>
      <div className="mx-auto max-w-6xl">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <DisplayHeading
          className={cn(
            "max-w-2xl text-[clamp(1.65rem,3.5vw,2.5rem)] leading-[1.08] tracking-[-0.025em]",
            eyebrow ? "mt-3" : null,
          )}
        >
          {heading}
        </DisplayHeading>
        {lead ? (
          <p className="mt-3 max-w-xl text-[0.95rem] leading-[1.55] text-muted-foreground">
            {lead}
          </p>
        ) : null}

        <ul className="mt-8 divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li
              key={`${item.label}-${item.price}`}
              className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] sm:items-baseline sm:gap-8"
            >
              <div>
                <p className="font-heading text-base tracking-tight text-foreground sm:text-lg">
                  {item.label}
                </p>
                {item.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                ) : null}
              </div>
              {item.detail ? (
                <p className="text-sm leading-snug text-muted-foreground">
                  {item.detail}
                </p>
              ) : (
                <span className="hidden sm:block" />
              )}
              <p className="font-heading text-base tabular-nums tracking-tight text-foreground sm:text-right sm:text-lg">
                {item.price}
              </p>
            </li>
          ))}
        </ul>

        {footnotes.length > 0 ? (
          <ul className="mt-5 space-y-1.5">
            {footnotes.map((note) => (
              <li
                key={note}
                className="text-xs leading-relaxed text-muted-foreground"
              >
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </SectionFrame>
  );
}
