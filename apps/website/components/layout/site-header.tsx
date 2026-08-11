"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 animate-hero-brand">
      <div className="border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 sm:px-10">
          <Link href="/" className="group min-w-0">
            <BrandWordmark className="text-base font-medium sm:text-lg" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Hauptnavigation">
            {siteNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="#kontakt"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-10 rounded-none bg-primary px-4 shadow-sm shadow-primary/15",
              )}
            >
              Gespräch vereinbaren
            </Link>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-none md:hidden"
                  aria-label="Menü öffnen"
                />
              }
            >
              <MenuIcon className="size-4" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex h-full flex-col rounded-none border-l border-border/70 bg-background/95 p-0 backdrop-blur-md"
            >
              <SheetHeader className="border-b border-border/60 px-6 py-5 text-left">
                <SheetTitle className="font-heading text-lg font-medium tracking-tight">
                  <BrandWordmark />
                </SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-1 px-3 py-4"
                aria-label="Mobile Navigation"
              >
                {siteNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-none px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto border-t border-border/60 px-6 py-5">
                <Link
                  href="#kontakt"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 w-full rounded-none bg-primary",
                  )}
                >
                  Gespräch vereinbaren
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
