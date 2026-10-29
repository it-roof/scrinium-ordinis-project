import type { ReactNode } from "react";

import {
  BottomPill,
  type PillNavItem,
} from "@/components/sections/bottom-pill";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteShellNav } from "@/components/sections/site-shell-nav";
import { cn } from "@/lib/utils";

type SiteShellProps = {
  children: ReactNode;
  /** Seiten-Anker fürs Bottom-Widget (z. B. Nutzen, Inhalte) — nicht die Site-Navbar */
  navItems: readonly PillNavItem[];
  pillPrompt?: string;
  pillVariant?: "search" | "links";
  className?: string;
  showFooter?: boolean;
};

export function SiteShell({
  children,
  navItems,
  pillPrompt,
  pillVariant = "links",
  className,
  showFooter = true,
}: SiteShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-svh bg-background text-foreground",
        className,
      )}
    >
      <SiteShellNav />

      <main className="pt-[4.25rem] sm:pt-[4.75rem]">{children}</main>

      {showFooter ? <SiteFooter /> : null}

      {/* Bottom-Widget: Seiten-Sprünge, ersetzt nicht die Navbar */}
      <BottomPill
        variant={pillVariant}
        tone={showFooter ? "dark" : "light"}
        prompt={pillPrompt ?? "Ask us anything"}
        items={navItems}
      />
    </div>
  );
}
