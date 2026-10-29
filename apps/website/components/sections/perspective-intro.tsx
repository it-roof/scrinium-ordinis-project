import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type PerspectiveIntroProps = {
  label?: string;
  title: string;
  lead?: string;
  className?: string;
};

/** Perspectives-Index-Hero: kleines Label + weiches Statement + optionaler Lead */
export function PerspectiveIntro({
  label = "Perspectives",
  title,
  lead,
  className,
}: PerspectiveIntroProps) {
  return (
    <SectionFrame
      className={cn(
        "flex min-h-[55svh] items-end px-6 pb-16 pt-28 sm:px-10 sm:pb-24 sm:pt-32",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-5xl">
        <SectionEyebrow className="mb-6">{label}</SectionEyebrow>
        <DisplayHeading
          as="h1"
          className="max-w-4xl text-[clamp(2rem,6.5vw,4.25rem)] leading-[1.05] text-muted-foreground/75 uppercase"
        >
          {title}
        </DisplayHeading>
        {lead ? (
          <p className="mt-8 max-w-xl font-heading text-[clamp(1.15rem,2.4vw,1.5rem)] leading-snug text-foreground">
            {lead}
          </p>
        ) : null}
      </div>
    </SectionFrame>
  );
}
