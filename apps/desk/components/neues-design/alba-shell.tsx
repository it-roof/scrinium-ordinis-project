"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import {
  ClipboardListIcon,
  FilePenLineIcon,
  FileStackIcon,
  FolderOpenIcon,
  HomeIcon,
  LogOutIcon,
  SparklesIcon,
  StickyNoteIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { PRODUCT_NAME } from "@scrinium/brand";

import { LabThemeProvider } from "@/components/neues-design/lab-theme";
import type { AreaFunctionId } from "@/lib/area/functions";
import { logoutAction } from "@/lib/auth/actions";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  functionId?: AreaFunctionId;
};

const NAV_PRIMARY: ReadonlyArray<NavItem> = [
  { label: "Übersicht", href: "/dashboard", icon: HomeIcon },
];

const NAV_DATA: ReadonlyArray<NavItem> = [
  {
    label: "Akten",
    href: "/r/akten",
    icon: FolderOpenIcon,
    functionId: "matters",
  },
  {
    label: "Mandanten",
    href: "/r/mandanten",
    icon: UserIcon,
    functionId: "clients",
  },
];

const NAV_FUNCTIONS: ReadonlyArray<NavItem> = [
  {
    label: "Prompt-Bibliothek",
    href: "/prompt",
    icon: SparklesIcon,
    functionId: "prompts",
  },
  {
    label: "Notizen",
    href: "/notizen",
    icon: StickyNoteIcon,
    functionId: "notes",
  },
  {
    label: "Mandats-Aufnahmebogen",
    href: "/aufnahmebogen",
    icon: ClipboardListIcon,
    functionId: "client-intake",
  },
  {
    label: "Textbausteine",
    href: "/r/textbausteine",
    icon: FileStackIcon,
    functionId: "text-blocks",
  },
  {
    label: "Vertragsanalyse",
    href: "/vertragsanalyse",
    icon: FilePenLineIcon,
    functionId: "contract-analysis",
  },
];

function filterNav(
  items: readonly NavItem[],
  allowedFunctions: AreaFunctionId[] | null
): NavItem[] {
  if (allowedFunctions === null) {
    return [...items];
  }
  const allowed = new Set(allowedFunctions);
  return items.filter(
    (item) => !item.functionId || allowed.has(item.functionId)
  );
}

export type AlbaShellUser = {
  name: string;
  roleLabel: string;
  email: string;
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="lab-nav-item inline-flex items-center gap-2 rounded-3xl px-3.5 py-2 text-[0.875rem] leading-snug"
      data-active={active ? "true" : "false"}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function SidebarSignOut() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="lab-sign-out inline-flex w-full items-center gap-2 rounded-3xl px-3.5 py-2 text-[0.875rem] leading-snug font-normal disabled:opacity-60"
      onClick={() => {
        startTransition(() => {
          void logoutAction();
        });
      }}
    >
      <LogOutIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
      {pending ? "Abmelden…" : "Abmelden"}
    </button>
  );
}

function AlbaShellInner({
  children,
  user,
  tenantName,
  fillMain,
  allowedFunctions,
}: {
  children: ReactNode;
  user: AlbaShellUser | null;
  tenantName: string | null;
  fillMain: boolean;
  allowedFunctions: AreaFunctionId[] | null;
}) {
  const pathname = usePathname();
  const settingsActive = pathname === "/einstellungen";
  const functions = filterNav(NAV_FUNCTIONS, allowedFunctions);
  const data = filterNav(NAV_DATA, allowedFunctions);

  return (
    <div className="brand-lab-root brand-alba brand-alba-manrope">
      <div className="brand-lab-shell">
        <aside
          className="hidden w-[17rem] shrink-0 flex-col border-r px-4 py-8 md:flex"
          style={{
            background: "var(--b-bg-elev)",
            borderColor: "var(--b-line)",
          }}
        >
          <Link href="/dashboard" className="block px-3.5 pt-1">
            <p className="b-display text-[1.25rem] leading-tight tracking-[-0.02em]">
              {PRODUCT_NAME}
            </p>
            {tenantName ? (
              <p className="b-meta mt-0.5 leading-snug">{tenantName}</p>
            ) : null}
          </Link>
          <nav className="mt-8 flex flex-1 flex-col gap-0.5 px-0.5">
            {NAV_PRIMARY.map((item) => (
              <NavLink
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                active={isNavActive(pathname, item.href)}
              />
            ))}
            {functions.length > 0 ? (
              <>
                <p
                  className="lab-nav-group mt-5 mb-1 px-3.5"
                  style={{ color: "var(--b-accent)" }}
                >
                  Funktionen
                </p>
                {functions.map((item) => (
                  <NavLink
                    key={item.href}
                    label={item.label}
                    href={item.href}
                    icon={item.icon}
                    active={isNavActive(pathname, item.href)}
                  />
                ))}
              </>
            ) : null}
            {data.length > 0 ? (
              <>
                <p
                  className="lab-nav-group mt-5 mb-1 px-3.5"
                  style={{ color: "var(--b-accent)" }}
                >
                  Daten
                </p>
                {data.map((item) => (
                  <NavLink
                    key={item.href}
                    label={item.label}
                    href={item.href}
                    icon={item.icon}
                    active={isNavActive(pathname, item.href)}
                  />
                ))}
              </>
            ) : null}
          </nav>

          <div className="mt-auto flex flex-col gap-1.5">
            {user ? (
              <Link
                href="/einstellungen"
                className="lab-user-card block px-3.5 py-3"
                data-active={settingsActive ? "true" : "false"}
              >
                <p className="truncate text-[0.8125rem] font-semibold">
                  {user.name}
                </p>
                <p className="b-meta mt-0.5 truncate">{user.email}</p>
                <p className="b-meta mt-0.5 truncate">{user.roleLabel}</p>
              </Link>
            ) : (
              <div className="lab-user-card px-3.5 py-3">
                <p className="text-[0.8125rem] font-semibold">Scrinium</p>
                <p className="b-meta mt-0.5">Quiet workspace</p>
              </div>
            )}
            {user ? <SidebarSignOut /> : null}
          </div>
        </aside>

        <main
          className={
            fillMain ? "brand-lab-main brand-lab-main--fill" : "brand-lab-main"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/** Gemeinsame Alba-Shell (Sidebar + Main) für Dashboard, Einstellungen, … */
export function AlbaShell({
  children,
  user = null,
  tenantName = null,
  fillMain = false,
  allowedFunctions = null,
}: {
  children: ReactNode;
  user?: AlbaShellUser | null;
  tenantName?: string | null;
  /** Main ohne Lab-Scroll — für eingebettete App-Views (DeskAppShell). */
  fillMain?: boolean;
  /** null = alle Funktionen; Array = nur erlaubte. */
  allowedFunctions?: AreaFunctionId[] | null;
}) {
  return (
    <LabThemeProvider>
      <AlbaShellInner
        user={user}
        tenantName={tenantName}
        fillMain={fillMain}
        allowedFunctions={allowedFunctions}
      >
        {children}
      </AlbaShellInner>
    </LabThemeProvider>
  );
}
