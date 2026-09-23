"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LAB_DATA,
  LAB_FUNCTIONS,
  LAB_MORE,
  LabFunctionIcon,
  type LabFunctionCard,
} from "@/components/neues-design/lab-functions";
import {
  LabThemeProvider,
  useLabTheme,
} from "@/components/neues-design/lab-theme";

const NAV_PRIMARY = [
  { label: "Übersicht", href: "/dashboard" },
  { label: "Meine Aufgaben", href: "/eingang" },
  { label: "Zuweisen", href: "/zuweisen" },
  { label: "Akten", href: "/r/akten" },
  { label: "Mandanten", href: "/r/mandanten" },
  { label: "Analyse", href: "/r/analyse" },
] as const;

const NAV_FUNCTIONS = [
  { label: "Prompt-Bibliothek", href: "/prompt" },
  { label: "Notizen", href: "/notizen" },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl px-3.5 py-2 text-[0.875rem] leading-snug transition-colors hover:bg-[color:var(--b-soft)] hover:text-[color:var(--b-ink)]"
      style={
        active
          ? {
              background: "var(--b-soft)",
              color: "var(--b-ink)",
              fontWeight: 600,
            }
          : {
              color: "var(--b-muted)",
              fontWeight: 400,
            }
      }
    >
      {label}
    </Link>
  );
}

function FunctionCard({ fn }: { fn: LabFunctionCard }) {
  return (
    <Link
      href={fn.href}
      className="lab-function-card group flex h-full flex-col border p-5 text-left"
    >
      <LabFunctionIcon icon={fn.icon} tone={fn.tone} />
      <span className="b-display mt-4 text-[1.125rem] leading-[1.25] tracking-[-0.01em]">
        {fn.title}
      </span>
      <span
        className="mt-2 line-clamp-2 min-h-[2.6em] text-[0.875rem] leading-[1.45] whitespace-pre-line"
        style={{ color: "var(--b-muted)" }}
      >
        {fn.body}
      </span>
      <span
        className="mt-5 text-[0.875rem] font-semibold tracking-[0.01em]"
        style={{ color: fn.tone.accent }}
      >
        Öffnen
      </span>
    </Link>
  );
}

function SectionHeading({
  title,
  subtitle,
  className = "mt-14",
}: {
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <>
      <h2
        className={`b-display text-[1.3125rem] font-semibold leading-tight tracking-[-0.015em] md:text-[1.375rem] ${className}`}
      >
        {title}
      </h2>
      <p
        className="mt-1.5 max-w-xl text-[0.9375rem] leading-[1.5] md:mt-2"
        style={{ color: "var(--b-muted)" }}
      >
        {subtitle}
      </p>
    </>
  );
}

function AppearanceSwitch() {
  const { appearance, setAppearance } = useLabTheme();

  return (
    <div
      className="flex items-center rounded-full p-0.5"
      style={{
        background: "var(--b-bg)",
        border: "1px solid var(--b-line)",
      }}
      role="group"
      aria-label="Erscheinungsbild"
    >
      {(
        [
          { id: "light" as const, label: "Hell" },
          { id: "dark" as const, label: "Dunkel" },
        ] as const
      ).map((opt) => {
        const isActive = appearance === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setAppearance(opt.id)}
            className="min-h-8 flex-1 rounded-full px-3 py-1 text-[0.8125rem] font-semibold transition-colors"
            style={
              isActive
                ? {
                    background: "var(--b-ink)",
                    color: "var(--b-bg-elev)",
                  }
                : { color: "var(--b-muted)" }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function DashboardAlbaInner({
  greeting,
  showAppearanceSwitch,
  user,
}: {
  greeting: string;
  showAppearanceSwitch: boolean;
  user: { name: string; roleLabel: string; email: string } | null;
}) {
  const pathname = usePathname();

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
          <div className="flex items-center gap-3 px-2 pt-1">
            <span
              className="b-display flex size-10 items-center justify-center rounded-full text-[1.15rem]"
              style={{
                background: "var(--b-soft)",
                color: "var(--b-accent)",
              }}
            >
              A
            </span>
            <div>
              <p className="b-display text-[1.25rem] leading-none">Alba</p>
              <p className="b-meta mt-1">Quiet desk</p>
            </div>
          </div>
          <nav className="mt-8 flex flex-1 flex-col gap-0.5 px-0.5">
            {NAV_PRIMARY.map((item) => (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                active={isNavActive(pathname, item.href)}
              />
            ))}
            <p
              className="b-eyebrow mt-5 mb-1 px-3.5"
              style={{ color: "var(--b-accent)" }}
            >
              Funktionen
            </p>
            {NAV_FUNCTIONS.map((item) => (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                active={isNavActive(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            {showAppearanceSwitch ? <AppearanceSwitch /> : null}
            <div
              className="px-3.5 py-3"
              style={{
                background: "var(--b-soft)",
                borderRadius: "10px",
              }}
            >
              {user ? (
                <>
                  <p className="truncate text-[0.8125rem] font-semibold">
                    {user.name}
                  </p>
                  <p className="b-meta mt-0.5 truncate">{user.email}</p>
                  <p className="b-meta mt-0.5 truncate">{user.roleLabel}</p>
                </>
              ) : (
                <>
                  <p className="text-[0.8125rem] font-semibold">Scrinium</p>
                  <p className="b-meta mt-0.5">Quiet workspace</p>
                </>
              )}
            </div>
          </div>
        </aside>

        <main className="brand-lab-main">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
            <header className="flex max-w-2xl flex-col">
              <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
                Übersicht
              </p>
              <h1 className="b-display b-title mt-3 tracking-[-0.02em] md:mt-3.5">
                {greeting}
              </h1>
              <p className="b-lead mt-2 max-w-none text-[1.0625rem] leading-[1.55] md:mt-2.5">
                Die wichtigsten Funktionen und Daten für Ihren Arbeitsalltag -
                einfach zu bedienen und unterstützt von der KI.
              </p>
            </header>

            <SectionHeading
              title="Funktionen"
              subtitle="Werkzeuge für Ihren Arbeitsalltag."
            />
            <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {LAB_FUNCTIONS.map((fn) => (
                <FunctionCard key={fn.href} fn={fn} />
              ))}
            </div>

            <SectionHeading
              title="Daten"
              subtitle="Stammdaten und Bezüge Ihrer Mandate."
            />
            <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {LAB_DATA.map((fn) => (
                <FunctionCard key={fn.href} fn={fn} />
              ))}
            </div>

            <SectionHeading
              title="Weitere"
              subtitle="Organisation und ergänzende Hilfsmittel."
            />
            <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {LAB_MORE.map((fn) => (
                <FunctionCard key={fn.href} fn={fn} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** ALBA · Manrope — wie /neues-design/alba-manrope */
export function DashboardAlba({
  greeting = "Guten Tag,",
  showAppearanceSwitch = false,
  user = null,
}: {
  greeting?: string;
  /** Hell/Dunkel über dem Scrinium-Footer (Dashboard); im Lab steckt der Switch im ConceptSwitcher. */
  showAppearanceSwitch?: boolean;
  user?: { name: string; roleLabel: string; email: string } | null;
}) {
  return (
    <LabThemeProvider>
      <DashboardAlbaInner
        greeting={greeting}
        showAppearanceSwitch={showAppearanceSwitch}
        user={user}
      />
    </LabThemeProvider>
  );
}
