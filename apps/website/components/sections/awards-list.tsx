import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type AwardItem = {
  title: string;
  detail?: string;
};

export type AwardsListProps = {
  heading: string;
  items: readonly AwardItem[];
  className?: string;
};

export function AwardsList({ heading, items, className }: AwardsListProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <DisplayHeading className="text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
          {heading}
        </DisplayHeading>

        <ul className="mt-12 divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <DisplayHeading as="h3" className="text-lg uppercase sm:text-xl">
                {item.title}
              </DisplayHeading>
              {item.detail ? (
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-right">
                  {item.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </SectionFrame>
  );
}
