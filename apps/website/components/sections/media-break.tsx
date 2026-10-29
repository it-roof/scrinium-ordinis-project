import Image from "next/image";

import { SectionFrame } from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type MediaBreakProps = {
  imageSrc: string;
  imageAlt: string;
  caption?: string;
  className?: string;
};

/** Full-bleed Bild ohne Overlay-Headline — AKQA Work-Detail-Rhythmus */
export function MediaBreak({
  imageSrc,
  imageAlt,
  caption,
  className,
}: MediaBreakProps) {
  return (
    <SectionFrame className={cn("px-0", className)}>
      <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9] sm:min-h-[52vh]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="100vw"
          priority={false}
        />
      </div>
      {caption ? (
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs tracking-wide text-muted-foreground sm:px-10">
          {caption}
        </p>
      ) : null}
    </SectionFrame>
  );
}
