import {
  DashboardWelcome,
  type DeskView,
} from "@/components/v1/dashboard/dashboard-welcome";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import type { AreaFunctionId } from "@/lib/area/functions";
import { FUNCTION_LABELS } from "@/lib/area/functions";
import { functionHref } from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";
import { getStaffDashboardStats } from "@/lib/staff-messages/storage";
import { formatDeskGreeting } from "@/lib/users/names";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

type QuickCardId =
  | "prompts"
  | "staff-messages"
  | "inbox"
  | "clients"
  | "matters"
  | "text-blocks";

function parseView(raw: string | undefined): DeskView {
  return raw === "all" ? "all" : "quick";
}

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
    hrefFor: (area) => functionHref(area, "prompts"),
  },
  "staff-messages": {
    description: "Aufgabe an Mitarbeitende zuweisen oder weitergeben.",
    hrefFor: (area) => functionHref(area, "staff-messages"),
  },
  inbox: {
    description: "Aufgaben, die bei dir liegen und abzuarbeiten sind.",
    hrefFor: (area) => functionHref(area, "inbox"),
  },
  clients: {
    description: "Mandanten anlegen, pflegen und Akten zuordnen.",
    hrefFor: (area) => functionHref(area, "clients"),
  },
  matters: {
    description: "Akten führen und dem richtigen Mandanten zuordnen.",
    hrefFor: (area) => functionHref(area, "matters"),
  },
  "text-blocks": {
    description: "Wiederkehrende Formulierungen speichern und übernehmen.",
    hrefFor: (area) => functionHref(area, "text-blocks"),
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
  const ctx = await requireV1DeskUser();
  const { view: viewRaw } = await searchParams;
  const view = parseView(viewRaw);

  const [nameRow, stats] = await Promise.all([
    db
      .select({
        salutation: users.salutation,
        lastName: users.lastName,
      })
      .from(users)
      .where(and(eq(users.id, ctx.userId), eq(users.tenantId, ctx.tenantId)))
      .limit(1),
    getStaffDashboardStats(ctx.tenantId, ctx.userId, ctx.area),
  ]);

  const allowed = ctx.allowedFunctions;

  const lawyerQuick = (["prompts", "staff-messages", "inbox"] as const).filter(
    (id) => isAllowed(allowed, id)
  );
  const secretaryQuick = (
    ["inbox", "staff-messages", "clients", "matters", "text-blocks"] as const
  ).filter((id) => isAllowed(allowed, id));

  const quickIds =
    ctx.deskRole === "sekretariat" ? secretaryQuick : lawyerQuick;

  const toolIds = (
    ["prompts", "text-blocks"] as const satisfies readonly QuickCardId[]
  ).filter((id) => isAllowed(allowed, id));

  const communicationIds = (
    ["inbox", "staff-messages"] as const satisfies readonly QuickCardId[]
  ).filter((id) => isAllowed(allowed, id));

  const managementIds = (
    ["clients", "matters"] as const satisfies readonly QuickCardId[]
  ).filter((id) => isAllowed(allowed, id));

  const quickFunctions = quickIds.map((id) => toCard(id, ctx.area));
  const functions = [...toolIds, ...managementIds].map((id) =>
    toCard(id, ctx.area)
  );
  const communicationFunctions = communicationIds.map((id) =>
    toCard(id, ctx.area)
  );

  const profile = nameRow[0];
  const greeting = formatDeskGreeting({
    salutation: profile?.salutation ?? null,
    lastName: profile?.lastName ?? "",
  });

  return (
    <V1AppShell ctx={ctx} headerTitle="Übersicht">
      <DashboardWelcome
        greeting={greeting}
        view={view}
        area={ctx.area}
        stats={stats}
        quickFunctions={quickFunctions}
        functions={functions}
        communicationFunctions={communicationFunctions}
      />
    </V1AppShell>
  );
}
