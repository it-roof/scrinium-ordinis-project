import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { PRODUCT_WORDMARK } from "@/lib/brand";

/** Schlanke Shell für Platform-Super-Admin (ohne Desk-Rolle). */
export function PlatformShell({
  children,
  title = "Plattform",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/platform"
            className="text-sm font-semibold tracking-tight"
          >
            {PRODUCT_WORDMARK}
          </Link>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="rounded-none"
          >
            Abmelden
          </Button>
        </form>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
    </div>
  );
}
