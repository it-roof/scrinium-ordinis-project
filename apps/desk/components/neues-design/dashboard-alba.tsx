"use client";

import Link from "next/link";

import { AlbaShell, type AlbaShellUser } from "@/components/neues-design/alba-shell";
import {
  LAB_DATA,
  LAB_FUNCTIONS,
  LAB_MORE,
  LabFunctionIcon,
  type LabFunctionCard,
} from "@/components/neues-design/lab-functions";

function FunctionCard({ fn }: { fn: LabFunctionCard }) {
  return (
    <Link
      href={fn.href}
      className="lab-function-card group flex h-full flex-col border p-5 text-left"
    >
      <LabFunctionIcon icon={fn.icon} tone={fn.tone} />
      <span className="b-display mt-4 text-[1.125rem] font-medium leading-[1.25] tracking-[-0.01em]">
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
        className={`b-display text-[1.3125rem] font-medium leading-tight tracking-[-0.015em] md:text-[1.375rem] ${className}`}
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

function DashboardAlbaContent({ greeting }: { greeting: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
      <header className="flex max-w-2xl flex-col">
        <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
          Übersicht
        </p>
        <h1 className="b-display b-title mt-3 font-medium tracking-[-0.02em] md:mt-3.5">
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
  );
}

/** ALBA · Manrope — Dashboard-Übersicht */
export function DashboardAlba({
  greeting = "Guten Tag,",
  user = null,
  tenantName = null,
}: {
  greeting?: string;
  user?: AlbaShellUser | null;
  tenantName?: string | null;
}) {
  return (
    <AlbaShell user={user} tenantName={tenantName}>
      <DashboardAlbaContent greeting={greeting} />
    </AlbaShell>
  );
}
