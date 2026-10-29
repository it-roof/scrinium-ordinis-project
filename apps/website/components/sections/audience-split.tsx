import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type AudienceSplitProps = {
  heading: string;
  forTitle: string;
  forItems: readonly string[];
  againstTitle: string;
  againstItems: readonly string[];
  className?: string;
};

export function AudienceSplit({
  heading,
  forTitle,
  forItems,
  againstTitle,
  againstItems,
  className,
}: AudienceSplitProps) {
  return (
    <SectionFrame className={cn("px-6 py-28 sm:px-10 sm:py-36", className)}>
      <div className="mx-auto max-w-5xl">
        <DisplayHeading className="text-[clamp(1.85rem,4.5vw,3rem)] tracking-[-0.02em] text-muted-foreground/70 uppercase">
          {heading}
        </DisplayHeading>
        <Hairline className="mt-10 max-w-[7rem] bg-border/70" />

        <div className="mt-16 grid gap-14 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-xs font-medium tracking-[0.18em] text-foreground uppercase">
              {forTitle}
            </h3>
            <ul className="mt-6 space-y-4">
              {forItems.map((item) => (
                <li
                  key={item}
                  className="border-t border-border/60 pt-4 text-[0.95rem] leading-[1.65] text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              {againstTitle}
            </h3>
            <ul className="mt-6 space-y-4">
              {againstItems.map((item) => (
                <li
                  key={item}
                  className="border-t border-border/60 pt-4 text-[0.95rem] leading-[1.65] text-muted-foreground/80"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
