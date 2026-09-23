"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import {
  ClipboardListIcon,
  FilePenLineIcon,
  FolderOpenIcon,
  HomeIcon,
  LogOutIcon,
  MoonIcon,
  SparklesIcon,
  StickyNoteIcon,
  SunIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { PRODUCT_NAME } from "@scrinium/brand";

import {
  LabThemeProvider,
  useLabTheme,
} from "@/components/neues-design/lab-theme";
import { logoutAction } from "@/lib/auth/actions";

const NAV_PRIMARY: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [{ label: "Übersicht", href: "/dashboard", icon: HomeIcon }];

const NAV_DATA: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: "Akten", href: "/r/akten", icon: FolderOpenIcon },
  { label: "Mandanten", href: "/r/mandanten", icon: UserIcon },
];

const NAV_FUNCTIONS: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: "Prompt-Bibliothek", href: "/prompt", icon: SparklesIcon },
  { label: "Notizen", href: "/notizen", icon: StickyNoteIcon },
  {
    label: "Mandats-Aufnahmebogen",
    href: "/aufnahmebogen",
    icon: ClipboardListIcon,
  },
  { label: "Vertragsanalyse", href: "/vertragsanalyse", icon: FilePenLineIcon },
];

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

function NavItem({
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

function AppearanceSwitch() {
  const { appearance, setAppearance } = useLabTheme();

  return (
    <div
      className="flex items-center justify-between gap-2 px-3.5"
      role="group"
      aria-label="Design"
    >
      <span
        className="text-[0.8125rem] font-medium"
        style={{ color: "var(--b-muted)" }}
      >
        Design
      </span>
      <div
        className="flex items-center rounded-3xl p-0.5"
        style={{
          background: "var(--b-bg)",
          border: "1px solid var(--b-line)",
        }}
      >
        {(
          [
            {
              id: "light" as const,
              label: "Hell",
              Icon: SunIcon,
            },
            {
              id: "dark" as const,
              label: "Dunkel",
              Icon: MoonIcon,
            },
          ] as const
        ).map((opt) => {
          const isActive = appearance === opt.id;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAppearance(opt.id)}
              aria-label={opt.label}
              aria-pressed={isActive}
              className="flex size-7 items-center justify-center rounded-3xl transition-colors"
              style={
                isActive
                  ? {
                      background: "var(--b-ink)",
                      color: "var(--b-bg-elev)",
                    }
                  : { color: "var(--b-muted)" }
              }
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AlbaShellInner({
  children,
  showAppearanceSwitch,
  user,
  tenantName,
  fillMain,
}: {
  children: ReactNode;
  showAppearanceSwitch: boolean;
  user: AlbaShellUser | null;
  tenantName: string | null;
  fillMain: boolean;
}) {
  const pathname = usePathname();
  const settingsActive = pathname === "/einstellungen";

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
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                active={isNavActive(pathname, item.href)}
              />
            ))}
            <p
              className="lab-nav-group mt-5 mb-1 px-3.5"
              style={{ color: "var(--b-accent)" }}
            >
              Funktionen
            </p>
            {NAV_FUNCTIONS.map((item) => (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                active={isNavActive(pathname, item.href)}
              />
            ))}
            <p
              className="lab-nav-group mt-5 mb-1 px-3.5"
              style={{ color: "var(--b-accent)" }}
            >
              Daten
            </p>
            {NAV_DATA.map((item) => (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                active={isNavActive(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            {showAppearanceSwitch ? <AppearanceSwitch /> : null}
            <div className="flex flex-col gap-1.5">
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
  showAppearanceSwitch = false,
  user = null,
  tenantName = null,
  fillMain = false,
}: {
  children: ReactNode;
  showAppearanceSwitch?: boolean;
  user?: AlbaShellUser | null;
  tenantName?: string | null;
  /** Main ohne Lab-Scroll — für eingebettete App-Views (DeskAppShell). */
  fillMain?: boolean;
}) {
  return (
    <LabThemeProvider>
      <AlbaShellInner
        showAppearanceSwitch={showAppearanceSwitch}
        user={user}
        tenantName={tenantName}
        fillMain={fillMain}
      >
        {children}
      </AlbaShellInner>
    </LabThemeProvider>
  );
}
