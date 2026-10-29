"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { AppearanceToggle } from "@/components/theme/appearance-toggle";
import { siteNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const CTA = {
  href: "mailto:hello@scrinium-ordinis.de?subject=Anfrage%20Scrinium",
  label: "Termin anfragen",
} as const;

/**
 * Premium-Navbar für SiteShell-Seiten.
 * Unabhängig vom Bottom-Widget (Seiten-Anker: Nutzen, Inhalte, …).
 */
export function SiteShellNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled
            ? "border-b border-border/50 bg-background/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
          className,
        )}
      >
        <div className="mx-auto flex h-[4.25rem] w-full max-w-[90rem] items-center justify-between gap-6 px-5 sm:h-[4.75rem] sm:px-8 lg:px-12">
          <Link
            href="/"
            className="font-heading text-[0.72rem] tracking-[0.32em] text-foreground uppercase transition-opacity hover:opacity-70 sm:text-[0.78rem]"
          >
            <BrandWordmark />
          </Link>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex"
            aria-label="Hauptnavigation"
          >
            {siteNav.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="text-[0.78rem] font-medium tracking-[0.14em] text-foreground/55 uppercase transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <AppearanceToggle className="size-10 shrink-0 rounded-full border-border/60" />
            <Link
              href={CTA.href}
              className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[0.7rem] font-medium tracking-[0.14em] text-background uppercase transition-opacity hover:opacity-85"
            >
              {CTA.label}
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <AppearanceToggle className="size-10 shrink-0 rounded-full border-border/60" />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex size-10 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-muted"
              aria-expanded={open}
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
            >
              {open ? (
                <XIcon className="size-4" />
              ) : (
                <MenuIcon className="size-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-background/97 backdrop-blur-xl md:hidden">
          <div className="flex h-[4.25rem] items-center justify-between px-5">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="font-heading text-[0.72rem] tracking-[0.32em] text-foreground uppercase"
            >
              <BrandWordmark />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-10 items-center justify-center rounded-full border border-border/60"
              aria-label="Menü schließen"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <nav
            className="flex flex-col gap-1 px-6 pt-10"
            aria-label="Mobile Hauptnavigation"
          >
            {siteNav.map((item) => (
              <Link
                key={`${item.href}-${item.label}-m`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-heading py-3 text-[clamp(1.75rem,8vw,2.5rem)] font-medium tracking-tight text-foreground/90 uppercase transition-opacity hover:opacity-50"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={CTA.href}
              onClick={() => setOpen(false)}
              className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-xs font-medium tracking-[0.14em] text-background uppercase"
            >
              {CTA.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}
