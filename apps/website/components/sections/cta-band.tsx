import Link from "next/link";

import {
  DisplayHeading,
  Hairline,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type CtaBandProps = {
  eyebrow?: string;
  title: string;
  body: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  className?: string;
};

export function CtaBand({
  eyebrow,
  title,
  body,
  primaryCta,
  secondaryCta,
  className,
}: CtaBandProps) {
  return (
    <SectionFrame className={cn("px-6 py-24 sm:px-10 sm:py-28", className)}>
      <div className="mx-auto max-w-3xl text-center">
        {eyebrow ? (
          <p className="text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <DisplayHeading className="mt-4 text-[clamp(1.75rem,4vw,2.75rem)] tracking-[-0.02em] uppercase">
          {title}
        </DisplayHeading>
        <Hairline className="mx-auto mt-8 max-w-[5rem] bg-border/70" />
        <p className="mx-auto mt-8 max-w-xl text-[0.95rem] leading-[1.7] text-muted-foreground">
          {body}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link
            href={primaryCta.href}
            className="inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-xs font-medium tracking-[0.14em] text-background uppercase transition-opacity hover:opacity-80"
          >
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="text-xs font-medium tracking-[0.14em] text-foreground/70 uppercase underline-offset-4 transition-opacity hover:opacity-50 hover:underline"
            >
              {secondaryCta.label} ↘
            </Link>
          ) : null}
        </div>
      </div>
    </SectionFrame>
  );
}
