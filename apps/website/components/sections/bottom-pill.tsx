"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { AppearanceToggle } from "@/components/theme/appearance-toggle";
import { cn } from "@/lib/utils";

export type PillNavItem = {
  href: string;
  label: string;
};

type BottomPillProps = {
  /** search = AKQA Home Prompt; links = Nav-Pills */
  variant?: "search" | "links";
  /** dark = blinkendes Widget unten rechts über Footer-Stage */
  tone?: "light" | "dark";
  prompt?: string;
  items: readonly PillNavItem[];
  className?: string;
  trailing?: ReactNode;
};

export function BottomPill({
  variant = "links",
  tone = "light",
  prompt = "Ask us anything",
  items,
  className,
  trailing,
}: BottomPillProps) {
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";

  useEffect(() => {
    if (!dark || !open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-slot='footer-ask-panel']")) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dark, open]);

  /*
   * Dark / AKQA:
   * – zu: blinkendes Widget unten rechts
   * – offen: Ask-Box mittig mit horizontalen Chips (wie zuvor bei AKQA)
   */
  if (dark) {
    return (
      <>
        {open ? (
          <div
            data-slot="footer-ask-panel"
            className={cn(
              "pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4",
              "bottom-[7.5rem] sm:bottom-[8.5rem]",
              className,
            )}
          >
            <div className="pointer-events-auto w-full max-w-[37.5rem] rounded-2xl border border-white/10 bg-[#1a1a1a]/88 px-4 py-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] leading-none text-white/45">
                  {prompt}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Schließen"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
              <nav
                className="mt-3 flex flex-wrap items-center gap-2"
                aria-label="Seitenabschnitte"
              >
                {items.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-white/25 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "pointer-events-none fixed z-50 right-4 bottom-5 sm:right-6 sm:bottom-8",
              className,
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="animate-pill-blink pointer-events-auto inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-[#1a1a1a]/92 px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:bg-[#222]/95"
              aria-expanded={false}
              aria-label={prompt}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-white"
              />
              <span>{prompt}</span>
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 sm:bottom-6",
          className,
        )}
      >
        <div
          className={cn(
            "pointer-events-auto flex items-center gap-1 rounded-full border border-border/50 bg-card/90 shadow-[var(--shadow-soft)] backdrop-blur-md",
            variant === "links"
              ? "max-w-[calc(100vw-2rem)] px-2 py-2 sm:gap-1.5 sm:px-2.5"
              : "w-full max-w-xl gap-2 px-4 py-2.5 sm:px-5",
          )}
        >
          {variant === "search" ? (
            <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              <span className="mr-1 text-foreground">|</span>
              {prompt}
            </p>
          ) : (
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Hauptnavigation"
            >
              {items.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-[0.7rem] font-medium tracking-wide text-foreground/80 transition-colors hover:bg-muted hover:text-foreground sm:px-4 sm:text-xs"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {trailing}

          <AppearanceToggle className="size-8 shrink-0 rounded-full border-border/50 sm:size-9" />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border border-border/50 text-foreground transition-colors hover:bg-muted sm:size-9",
              variant === "links" && "md:hidden",
            )}
            aria-expanded={open}
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
          >
            {open ? (
              <XIcon className="size-3.5" />
            ) : (
              <MenuIcon className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 bg-background/97 backdrop-blur-md">
          <nav
            className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-1 px-8"
            aria-label="Overlay-Navigation"
          >
            {items.map((item) => (
              <Link
                key={`${item.href}-${item.label}-overlay`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-heading text-[clamp(2rem,7vw,3.75rem)] font-medium tracking-tight text-foreground/85 uppercase transition-opacity hover:opacity-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
