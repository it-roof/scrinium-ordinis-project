import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type MetricItem = {
  value: string;
  label: string;
};

export type MetricGridProps = {
  heading?: string;
  lead?: string;
  items: readonly MetricItem[];
  className?: string;
};

export function MetricGrid({
  heading = "Ergebnis",
  lead,
  items,
  className,
}: MetricGridProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <DisplayHeading className="text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
          {heading}
        </DisplayHeading>
        {lead ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {lead}
          </p>
        ) : null}

        <ul className="mt-12 grid gap-0 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={`${item.value}-${item.label}`}
              className="border-b border-border py-8 sm:border-r sm:px-6 sm:odd:pl-0 lg:[&:nth-child(4n)]:border-r-0"
            >
              <DisplayHeading as="h3" className="text-[clamp(2rem,4vw,3rem)] leading-none">
                {item.value}
              </DisplayHeading>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </SectionFrame>
  );
}
