import {
  DashboardWelcome,
  type DeskView,
} from "@/components/desk/dashboard/dashboard-welcome";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import type { AreaFunctionId } from "@/lib/area/functions";
import { FUNCTION_LABELS } from "@/lib/area/functions";
import { isSecretaryDeskRole } from "@/lib/area/desk-roles";
import { hrefFor } from "@/lib/area/paths";
import { parseDashboardViewPreference } from "@/lib/dashboard/view-preference";
import type { AppModuleId } from "@/lib/modules";
import { getStaffDashboardStats } from "@/lib/staff-messages/storage";
import { formatDeskGreeting } from "@/lib/users/names";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

type QuickCardId =
  | "prompts"
  | "notes"
  | "case-facts-analysis"
  | "staff-messages"
  | "inbox"
  | "clients"
  | "matters"
  | "text-blocks"
  | "letters"
  | "docs"
  | "templates";

function isAllowed(
  allowedFunctions: AreaFunctionId[] | null,
  id: AreaFunctionId
) {
  return allowedFunctions === null || allowedFunctions.includes(id);
}

const CARD_META: Record<
  QuickCardId,
  { description: string; hrefFor: (area: AppModuleId) => string }
> = {
  prompts: {
    description:
      "KI-Prompts speichern, suchen und mit einem Klick kopieren.",
    hrefFor: () => hrefFor("prompts"),
  },
  notes: {
    description: "Persönliche Notizen — nur für dich, mit Diktat.",
    hrefFor: () => hrefFor("notes"),
  },
  "case-facts-analysis": {
    description:
      "Sachverhalt aus einer Akte mit KI analysieren — Entwurf zur Prüfung.",
    hrefFor: (area) => hrefFor("case-facts-analysis", area),
  },
  "staff-messages": {
    description: "Aufgabe an Mitarbeitende zuweisen oder weitergeben.",
    hrefFor: () => hrefFor("staff-messages"),
  },
  inbox: {
    description: "Aufgaben, die bei dir liegen und abzuarbeiten sind.",
    hrefFor: () => hrefFor("inbox"),
  },
  clients: {
    description: "Mandanten anlegen, pflegen und Akten zuordnen.",
    hrefFor: (area) => hrefFor("clients", area),
  },
  matters: {
    description: "Akten führen und dem richtigen Mandanten zuordnen.",
    hrefFor: (area) => hrefFor("matters", area),
  },
  "text-blocks": {
    description: "Wiederkehrende Formulierungen speichern und übernehmen.",
    hrefFor: (area) => hrefFor("text-blocks", area),
  },
  letters: {
    description: "Schreiben entwerfen, prüfen und versenden.",
    hrefFor: (area) => hrefFor("letters", area),
  },
  docs: {
    description: "Interne Dokumentation und Arbeitsanweisungen.",
    hrefFor: (area) => hrefFor("docs", area),
  },
  templates: {
    description: "Vorlagen und Dateien zum Herunterladen.",
    hrefFor: (area) => hrefFor("templates", area),
  },
};

function toCard(
  id: QuickCardId,
  area: AppModuleId
): {
  id: QuickCardId;
  title: string;
  description: string;
  href: string;
} {
  return {
    id,
    title:
      id === "staff-messages" ? "Aufgaben zuweisen" : FUNCTION_LABELS[id],
    description: CARD_META[id].description,
    href: CARD_META[id].hrefFor(area),
  };
}

export default async function Page({ searchParams }: PageProps) {
  const ctx = await requireDeskUser();
  const { view: viewRaw } = await searchParams;

  const [nameRow, stats] = await Promise.all([
    db
      .select({
        salutation: users.salutation,
        lastName: users.lastName,
        dashboardView: users.dashboardView,
      })
      .from(users)
      .where(and(eq(users.id, ctx.userId), eq(users.tenantId, ctx.tenantId)))
      .limit(1),
    getStaffDashboardStats(ctx.tenantId, ctx.userId, ctx.area),
  ]);

  const preferredView = parseDashboardViewPreference(
    nameRow[0]?.dashboardView
  );
  const hasExplicitView = viewRaw === "all" || viewRaw === "quick";
  const view: DeskView = hasExplicitView
    ? parseDashboardViewPreference(viewRaw)
    : preferredView;

  if (!hasExplicitView && preferredView === "all") {
    redirect("/dashboard?view=all");
  }

  const allowed = ctx.allowedFunctions;

  const lawyerQuick = (
    [
      "case-facts-analysis",
      "prompts",
      "notes",
      "letters",
      "staff-messages",
      "inbox",
    ] as const
  ).filter((id) => isAllowed(allowed, id));
  const secretaryQuick = (
    [
      "inbox",
      "staff-messages",
      "clients",
      "matters",
      "text-blocks",
      "letters",
    ] as const
  ).filter((id) => isAllowed(allowed, id));

  const quickIds = isSecretaryDeskRole(ctx.deskRole)
    ? secretaryQuick
    : lawyerQuick;

  const toolIds = (
    [
      "case-facts-analysis",
      "prompts",
      "notes",
      "letters",
      "text-blocks",
      "docs",
      "templates",
    ] as const satisfies readonly QuickCardId[]
  ).filter((id) => isAllowed(allowed, id));

  const communicationIds = (
    ["inbox", "staff-messages"] as const satisfies readonly QuickCardId[]
  ).filter((id) => isAllowed(allowed, id));

  const managementIds = (
    ["clients", "matters"] as const satisfies readonly QuickCardId[]
  ).filter((id) => isAllowed(allowed, id));

  // „Alle Funktionen“: Werkzeuge getrennt von Verwaltung
  const allFunctionIds: QuickCardId[] = [...toolIds];

  const quickFunctions = quickIds.map((id) => toCard(id, ctx.area));
  const functions = allFunctionIds.map((id) => toCard(id, ctx.area));
  const communicationFunctions = communicationIds.map((id) =>
    toCard(id, ctx.area)
  );
  const managementFunctions = managementIds.map((id) => toCard(id, ctx.area));

  const profile = nameRow[0];
  const greeting = formatDeskGreeting({
    salutation: profile?.salutation ?? null,
    lastName: profile?.lastName ?? "",
  });

  return (
    <DeskAppShell ctx={ctx} headerTitle="Übersicht">
      <DashboardWelcome
        greeting={greeting}
        view={view}
        area={ctx.area}
        stats={stats}
        quickFunctions={quickFunctions}
        functions={functions}
        communicationFunctions={communicationFunctions}
        managementFunctions={managementFunctions}
      />
    </DeskAppShell>
  );
}
