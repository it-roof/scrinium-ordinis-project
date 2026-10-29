import Link from "next/link";

import { DisplayHeading, SectionFrame } from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type ClosingCtaProps = {
  lineOne?: string;
  lineTwo: string;
  href?: string;
  className?: string;
};

export function ClosingCta({
  lineOne = "Was ist Ihr",
  lineTwo,
  href,
  className,
}: ClosingCtaProps) {
  const title = (
    <DisplayHeading
      as="h2"
      className="text-[clamp(2.75rem,9vw,6rem)] leading-[0.95] tracking-[-0.03em] uppercase"
    >
      <span className="block text-muted-foreground/45">{lineOne}</span>
      <span className="block text-foreground">{lineTwo}</span>
    </DisplayHeading>
  );

  return (
    <SectionFrame className={cn("px-6 py-32 sm:px-10 sm:py-40", className)}>
      <div className="mx-auto max-w-5xl text-center">
        {href ? (
          <Link
            href={href}
            className="group inline-block transition-opacity hover:opacity-55"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </div>
    </SectionFrame>
  );
}
