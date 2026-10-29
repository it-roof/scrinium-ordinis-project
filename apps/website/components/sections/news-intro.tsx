import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type NewsIntroProps = {
  label?: string;
  /** Zwei Zeilen wie „Latest &“ / „Greatest“ */
  lineOne: string;
  lineTwo: string;
  className?: string;
};

/** News-Index-Hero: Label + zweizeiliges Statement mit Kontrast auf Zeile 2 */
export function NewsIntro({
  label = "News",
  lineOne,
  lineTwo,
  className,
}: NewsIntroProps) {
  return (
    <SectionFrame
      className={cn(
        "flex min-h-[60svh] items-center justify-center px-6 py-24 sm:px-10 sm:py-32",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-5xl text-center">
        <SectionEyebrow className="mb-8">{label}</SectionEyebrow>
        <DisplayHeading
          as="h1"
          className="text-[clamp(2.5rem,8vw,5rem)] leading-[0.95] uppercase"
        >
          <span className="block text-foreground">{lineOne}</span>
          <span className="block text-muted-foreground/55">{lineTwo}</span>
        </DisplayHeading>
      </div>
    </SectionFrame>
  );
}
