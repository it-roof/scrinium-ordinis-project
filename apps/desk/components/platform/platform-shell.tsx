import Link from "next/link";

import { logoutAction } from "@/lib/auth/actions";
import { PRODUCT_WORDMARK } from "@/lib/brand";

import "@/app/neues-design/brand-lab.css";

const NAV = [
  { href: "/platform", label: "Kanzleien", id: "tenants" as const },
  {
    href: "/platform/prompts",
    label: "Prompt-Bibliothek",
    id: "prompts" as const,
  },
];

function navActive(pathname: string, id: "tenants" | "prompts") {
  if (id === "prompts") {
    return (
      pathname === "/platform/prompts" ||
      pathname.startsWith("/platform/prompts/")
    );
  }
  return (
    pathname === "/platform" ||
    pathname === "/platform/" ||
    pathname.startsWith("/platform/tenants")
  );
}

/** Schlanke Shell für Platform-Super-Admin (ohne Desk-Rolle). */
export function PlatformShell({
  children,
  title = "Plattform",
  pathname = "/platform",
}: {
  children: React.ReactNode;
  title?: string;
  /** Aktueller Pfad für die Nav-Hervorhebung. */
  pathname?: string;
}) {
  return (
    <div
      className="brand-lab-root brand-alba brand-alba-manrope flex min-h-0 flex-1 flex-col overflow-hidden"
      style={
        {
          "--font-alba-manrope": "var(--font-manrope)",
          background: "var(--b-bg)",
          color: "var(--b-ink)",
        } as React.CSSProperties
      }
    >
      <header
        className="flex h-12 shrink-0 items-center justify-between border-b px-4 lg:px-6"
        style={{ borderColor: "var(--b-line)" }}
      >
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <Link
            href="/platform"
            className="b-display shrink-0 text-[0.9375rem] font-medium tracking-[-0.01em]"
          >
            {PRODUCT_WORDMARK}
          </Link>
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = navActive(pathname, item.id);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="b-meta shrink-0 rounded-md px-2.5 py-1.5 transition-colors"
                  style={{
                    color: active ? "var(--b-ink)" : "var(--b-muted)",
                    background: active ? "var(--b-soft)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <span
            className="b-meta hidden shrink-0 sm:inline"
            style={{ color: "var(--b-faint)" }}
          >
            {title}
          </span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="b-btn b-btn-ghost">
            Abmelden
          </button>
        </form>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
