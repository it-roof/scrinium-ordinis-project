import Image from "next/image";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type MediaHeroProps = {
  eyebrow?: string;
  title: string;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
};

export function MediaHero({
  eyebrow,
  title,
  imageSrc,
  imageAlt = "",
  className,
}: MediaHeroProps) {
  return (
    <SectionFrame className={cn("relative min-h-[70svh] overflow-hidden", className)}>
      <div className="absolute inset-0">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,var(--atmosphere-1),transparent_55%),radial-gradient(ellipse_70%_50%_at_90%_10%,var(--atmosphere-2),transparent_50%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--primary)_18%,var(--background)))]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-28 sm:px-10 sm:pb-20">
        {eyebrow ? <SectionEyebrow className="mb-4">{eyebrow}</SectionEyebrow> : null}
        <DisplayHeading
          as="h1"
          className="max-w-4xl text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] uppercase"
        >
          {title}
        </DisplayHeading>
      </div>
    </SectionFrame>
  );
}
