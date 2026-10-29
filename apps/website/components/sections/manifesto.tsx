import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type ManifestoProps = {
  title: string;
  lead: string;
  paragraphs?: readonly string[];
  /** soft = AKQA About/Expertise heller Display-Titel */
  tone?: "soft" | "bold";
  className?: string;
};

export function Manifesto({
  title,
  lead,
  paragraphs = [],
  tone = "soft",
  className,
}: ManifestoProps) {
  return (
    <SectionFrame className={cn("px-6 py-28 sm:px-10 sm:py-36", className)}>
      <div className="mx-auto max-w-4xl text-center">
        <DisplayHeading
          className={cn(
            "text-[clamp(2rem,6.5vw,4.25rem)] leading-[1.05] tracking-[-0.02em] uppercase",
            tone === "soft"
              ? "text-muted-foreground/55"
              : "text-foreground",
          )}
        >
          {title}
        </DisplayHeading>
        <Hairline className="mx-auto mt-12 max-w-[7rem] bg-border/80" />
        <p className="mx-auto mt-12 max-w-2xl font-heading text-[clamp(1.2rem,2.6vw,1.55rem)] leading-[1.45] text-balance text-foreground/90">
          {lead}
        </p>
        {paragraphs.length > 0 ? (
          <div className="mx-auto mt-10 max-w-xl space-y-6 text-center text-[0.95rem] leading-[1.7] text-muted-foreground sm:text-base">
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        ) : null}
      </div>
    </SectionFrame>
  );
}
