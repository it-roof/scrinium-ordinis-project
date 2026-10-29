import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type StatementHeroProps = {
  lines: readonly string[];
  /** soft = heller Text (Expertise), bold = voller Kontrast, fade = letzte Wörter weicher (Work) */
  tone?: "soft" | "bold" | "fade";
  align?: "left" | "center";
  minHeight?: "screen" | "tall";
  className?: string;
};

export function StatementHero({
  lines,
  tone = "bold",
  align = "center",
  minHeight = "screen",
  className,
}: StatementHeroProps) {
  return (
    <SectionFrame
      className={cn(
        "flex items-center px-6 sm:px-10",
        minHeight === "screen" ? "min-h-svh py-28" : "min-h-[70svh] py-24 sm:py-32",
        className,
      )}
    >
      <div
        className={cn(
          "w-full",
          align === "center"
            ? "mx-auto max-w-5xl text-center"
            : "mr-auto max-w-[42rem] text-left lg:max-w-[48rem] lg:pl-6 xl:pl-10",
        )}
      >
        <DisplayHeading
          as="h1"
          className={cn(
            "text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.02] tracking-[-0.02em] uppercase",
            tone === "soft" && "font-medium text-foreground/35",
            tone === "bold" && "font-medium text-foreground",
          )}
        >
          {lines.map((line, lineIndex) => {
            if (tone !== "fade") {
              return (
                <span key={line} className="block">
                  {line}
                </span>
              );
            }

            const words = line.split(" ");
            const softFrom = Math.max(words.length - 2, 1);

            return (
              <span key={line} className="block">
                {words.map((word, wordIndex) => (
                  <span
                    key={`${lineIndex}-${word}-${wordIndex}`}
                    className={cn(
                      wordIndex > 0 ? " ml-[0.28em]" : "",
                      wordIndex >= softFrom
                        ? "text-muted-foreground/40"
                        : "text-foreground",
                    )}
                  >
                    {word}
                  </span>
                ))}
              </span>
            );
          })}
        </DisplayHeading>
      </div>
    </SectionFrame>
  );
}
