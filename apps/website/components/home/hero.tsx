import { KANZLEI_NAME, SITE_TAGLINE } from "@scrinium/brand";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="content-canvas relative flex min-h-svh flex-col overflow-hidden">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_-10%,oklch(0.72_0.1_235_/_0.28),transparent_55%),radial-gradient(ellipse_70%_50%_at_95%_5%,oklch(0.78_0.08_185_/_0.22),transparent_50%),radial-gradient(ellipse_60%_55%_at_80%_100%,oklch(0.82_0.09_75_/_0.18),transparent_55%)] animate-hero-wash" />
        <div className="absolute -left-24 top-1/4 size-[28rem] rounded-full bg-[oklch(0.7_0.1_250_/_0.12)] blur-3xl animate-hero-drift" />
        <div className="absolute -right-16 bottom-0 size-[22rem] rounded-full bg-[oklch(0.75_0.08_185_/_0.14)] blur-3xl animate-hero-drift-delayed" />
        <div className="hero-grid absolute inset-0 opacity-[0.35]" />
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-400 via-teal-400 to-amber-400 animate-hero-bar" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-16 pt-28 sm:px-10 sm:pb-24 lg:justify-center lg:pb-20">
        <div className="max-w-3xl pl-3 sm:pl-5">
          <div className="space-y-3 animate-hero-brand">
            <div className="accent-rule" />
            <p className="text-[0.7rem] font-medium tracking-[0.22em] text-accent-foreground/80 uppercase">
              {KANZLEI_NAME}
            </p>
          </div>

          <h1 className="mt-8 font-heading text-[clamp(2.75rem,8vw,5.75rem)] font-medium leading-[0.95] tracking-tight animate-hero-brand [animation-delay:90ms]">
            <BrandWordmark stacked className="font-medium" />
          </h1>

          <p className="mt-10 max-w-xl font-heading text-[clamp(1.35rem,2.8vw,1.85rem)] font-medium leading-snug tracking-tight text-balance animate-hero-copy">
            Klarheit in der Kanzleiarbeit.
          </p>

          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg animate-hero-copy [animation-delay:120ms]">
            {SITE_TAGLINE}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3 animate-hero-cta">
            <Link
              href="#module"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 rounded-none bg-primary px-6 text-[0.95rem] shadow-[var(--shadow-soft)] shadow-primary/15 transition-transform hover:-translate-y-0.5",
              )}
            >
              Mehr erfahren
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="#kontakt"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 rounded-none border-border/80 bg-card/60 px-6 text-[0.95rem] backdrop-blur-sm transition-transform hover:-translate-y-0.5",
              )}
            >
              Kontakt
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
