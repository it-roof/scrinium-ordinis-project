"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  ClipboardListIcon,
  UserRoundIcon,
  FilePenLineIcon,
  FileStackIcon,
  FileTextIcon,
  FolderOpenIcon,
  InboxIcon,
  ListIcon,
  MailIcon,
  MailQuestionMarkIcon,
  MailWarningIcon,
  MessageSquareIcon,
  PrinterIcon,
  ScaleIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getActiveAreaLabel } from "@/lib/area/active-area";
import type { DeskRoleId } from "@/lib/area/desk-roles";
import {
  FUNCTION_LABELS,
  filterFunctionsByAllowlist,
  getFunctionsForArea,
  COMMUNICATION_FUNCTION_IDS,
  MANAGEMENT_FUNCTION_IDS,
  PINNED_FUNCTION_IDS,
  TOOL_FUNCTION_IDS,
  type AreaFunctionId,
} from "@/lib/area/functions";
import {
  buildLawyerQuickViewFunctionIds,
  buildQuickViewFunctionIds,
  buildSecretaryQuickViewFunctionIds,
  getFunctionUsageCounts,
} from "@/lib/area/function-usage";
import { functionHref } from "@/lib/area/paths";
import { APP_MODULES, type AppModuleId } from "@/lib/modules";
import type { StaffDashboardLists, StaffDashboardStats, StaffDashboardPreviewItem } from "@/lib/staff-messages/storage";
import { priorityLabel } from "@/lib/staff-messages/types";
import { cn } from "@/lib/utils";

type DeskView = "quick" | "all";

function deskViewStorageKey(area: AppModuleId) {
  return `desk-start-view:${area}`;
}

const featureMeta: Record<
  AreaFunctionId,
  {
    description: string;
    icon: LucideIcon;
    iconWrap: string;
    linkClass: string;
    cardClass: string;
  }
> = {
  inbox: {
    description: "Offene Nachrichten und Aufgaben im Eingang bearbeiten.",
    icon: InboxIcon,
    iconWrap: "bg-amber-100 text-amber-800 ring-amber-200/70",
    linkClass: "text-amber-700",
    cardClass:
      "hover:border-amber-200/80 hover:bg-gradient-to-br hover:from-amber-50/50 hover:to-white",
  },
  "inbox-overview": {
    description: "Verlauf aller Nachrichten und Aufgaben.",
    icon: ListIcon,
    iconWrap: "bg-amber-50 text-amber-800 ring-amber-200/60",
    linkClass: "text-amber-700",
    cardClass:
      "hover:border-amber-200/70 hover:bg-gradient-to-br hover:from-amber-50/40 hover:to-white",
  },
  clients: {
    description: "Firmen und Privatpersonen mit Akten führen.",
    icon: UserRoundIcon,
    iconWrap: "bg-cyan-100 text-cyan-800 ring-cyan-200/70",
    linkClass: "text-cyan-700",
    cardClass:
      "hover:border-cyan-200/80 hover:bg-gradient-to-br hover:from-cyan-50/50 hover:to-white",
  },
  matters: {
    description: "Alle Akten im Überblick — nach Mandant und Aktenzeichen.",
    icon: FolderOpenIcon,
    iconWrap: "bg-sky-100 text-sky-800 ring-sky-200/70",
    linkClass: "text-sky-700",
    cardClass:
      "hover:border-sky-200/80 hover:bg-gradient-to-br hover:from-sky-50/50 hover:to-white",
  },
  "compose-letter": {
    description: "Anwaltsschreiben oder Brief entwerfen.",
    icon: FileTextIcon,
    iconWrap: "bg-rose-100 text-rose-800 ring-rose-200/70",
    linkClass: "text-rose-700",
    cardClass:
      "hover:border-rose-200/80 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-white",
  },
  "compose-email": {
    description:
      "Kurze E-Mail per KI — mit {{TEXT}} zum Ersetzen in Scrinium.",
    icon: MailIcon,
    iconWrap: "bg-sky-100 text-sky-800 ring-sky-200/70",
    linkClass: "text-sky-700",
    cardClass:
      "hover:border-sky-200/80 hover:bg-gradient-to-br hover:from-sky-50/50 hover:to-white",
  },
  "compose-print": {
    description:
      "Markdown-Inhalt einfügen — daraus wird ein PDF erzeugt und im Browser geöffnet.",
    icon: PrinterIcon,
    iconWrap: "bg-amber-100 text-amber-800 ring-amber-200/70",
    linkClass: "text-amber-700",
    cardClass:
      "hover:border-amber-200/80 hover:bg-gradient-to-br hover:from-amber-50/50 hover:to-white",
  },
  "text-blocks": {
    description:
      "Wiederverwendbare Formulierungen für Schreiben, E-Mails und Vorlagen.",
    icon: FileTextIcon,
    iconWrap: "bg-sky-100 text-sky-700 ring-sky-200/70",
    linkClass: "text-sky-700",
    cardClass:
      "hover:border-sky-200/80 hover:bg-gradient-to-br hover:from-sky-50/50 hover:to-white",
  },
  prompts: {
    description:
      "KI-Prompts speichern, suchen und mit einem Klick kopieren.",
    icon: SparklesIcon,
    iconWrap: "bg-violet-100 text-violet-700 ring-violet-200/70",
    linkClass: "text-violet-700",
    cardClass:
      "hover:border-violet-200/80 hover:bg-gradient-to-br hover:from-violet-50/50 hover:to-white",
  },
  docs: {
    description: "Interne Anleitungen und Prozesse.",
    icon: BookOpenIcon,
    iconWrap: "bg-lime-100 text-lime-800 ring-lime-200/70",
    linkClass: "text-lime-700",
    cardClass:
      "hover:border-lime-200/80 hover:bg-gradient-to-br hover:from-lime-50/50 hover:to-white",
  },
  templates: {
    description:
      "Vollmachten, Fragebögen und weitere Dateien zum Herunterladen.",
    icon: FileStackIcon,
    iconWrap: "bg-emerald-100 text-emerald-800 ring-emerald-200/70",
    linkClass: "text-emerald-700",
    cardClass:
      "hover:border-emerald-200/80 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-white",
  },
  "prompt-kit": {
    description:
      "Fallschilderung eingeben und daraus einen KI-Prompt erzeugen.",
    icon: ScaleIcon,
    iconWrap: "bg-indigo-100 text-indigo-800 ring-indigo-200/70",
    linkClass: "text-indigo-700",
    cardClass:
      "hover:border-indigo-200/80 hover:bg-gradient-to-br hover:from-indigo-50/50 hover:to-white",
  },
  letters: {
    description: "Entwürfe mit Platzhaltern — als PDF oder Word ausgeben.",
    icon: FilePenLineIcon,
    iconWrap: "bg-rose-100 text-rose-800 ring-rose-200/70",
    linkClass: "text-rose-700",
    cardClass:
      "hover:border-rose-200/80 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-white",
  },
  "staff-messages": {
    description:
      "Nachricht hinterlassen, Aufgabe erteilen oder ein Dokument senden.",
    icon: MessageSquareIcon,
    iconWrap: "bg-blue-100 text-blue-800 ring-blue-200/70",
    linkClass: "text-blue-700",
    cardClass:
      "hover:border-blue-200/80 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-white",
  },
};

function FeatureCard({
  area,
  functionId,
  title,
}: {
  area: AppModuleId;
  functionId: AreaFunctionId;
  title?: string;
}) {
  const meta = featureMeta[functionId];
  return (
    <Link
      href={functionHref(area, functionId)}
      className={cn(
        "group block rounded-none border border-border bg-card p-6 transition-colors",
        meta.cardClass
      )}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-none ring-1",
          meta.iconWrap
        )}
      >
        <meta.icon className="size-5" />
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="font-heading text-lg font-medium tracking-tight">
          {title ?? FUNCTION_LABELS[functionId]}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
      </div>

      <div
        className={cn(
          "mt-6 flex items-center gap-1.5 text-sm font-medium",
          meta.linkClass
        )}
      >
        Öffnen
        <ArrowRightIcon className="size-4" />
      </div>
    </Link>
  );
}

function FeatureSection({
  title,
  description,
  area,
  functionIds,
  titleForFunction,
}: {
  title: string;
  description: string;
  area: AppModuleId;
  functionIds: AreaFunctionId[];
  titleForFunction?: (functionId: AreaFunctionId) => string | undefined;
}) {
  if (functionIds.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-medium tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {functionIds.map((functionId) => (
          <FeatureCard
            key={functionId}
            area={area}
            functionId={functionId}
            title={titleForFunction?.(functionId)}
          />
        ))}
      </div>
    </section>
  );
}

const DASHBOARD_CARDS: {
  key: keyof StaffDashboardStats;
  label: string;
  valueSuffix?: string;
  hrefSuffix: string;
  icon: LucideIcon;
  valueClass: string;
  iconClass: string;
  cardClass: string;
}[] = [
  {
    key: "sofort",
    label: "Sofort",
    hrefSuffix: "",
    icon: MailWarningIcon,
    valueClass: "text-rose-950",
    iconClass: "text-rose-700/70",
    cardClass:
      "border-rose-200/80 bg-rose-50/70 hover:border-rose-300 hover:bg-rose-50",
  },
  {
    key: "heute",
    label: "Heute",
    hrefSuffix: "",
    icon: MailQuestionMarkIcon,
    valueClass: "text-amber-950",
    iconClass: "text-amber-700/70",
    cardClass:
      "border-amber-200/80 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-50",
  },
  {
    key: "unread",
    label: "Nachrichten",
    valueSuffix: "ungelesen",
    hrefSuffix: "",
    icon: MailIcon,
    valueClass: "text-sky-950",
    iconClass: "text-sky-700/70",
    cardClass:
      "border-sky-200/80 bg-sky-50/70 hover:border-sky-300 hover:bg-sky-50",
  },
  {
    key: "completedThisWeek",
    label: "Erledigt",
    valueSuffix: "diese Woche",
    hrefSuffix: "",
    icon: CheckIcon,
    valueClass: "text-emerald-950",
    iconClass: "text-emerald-700/70",
    cardClass:
      "border-emerald-200/80 bg-emerald-50/70 hover:border-emerald-300 hover:bg-emerald-50",
  },
];

function DashboardMetricCard({
  label,
  value,
  valueSuffix,
  href,
  icon: Icon,
  valueClass,
  iconClass,
  cardClass,
}: {
  label: string;
  value: number;
  valueSuffix?: string;
  href: string;
  icon: LucideIcon;
  valueClass: string;
  iconClass: string;
  cardClass: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[6.75rem] flex-col rounded-none border p-5 transition-colors",
        cardClass
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={cn("size-5 shrink-0", iconClass)} aria-hidden />
        <p className="text-base font-medium tracking-tight text-foreground">
          {label}
        </p>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={cn(
            "font-heading text-3xl font-medium tracking-tight tabular-nums leading-none",
            valueClass
          )}
        >
          {value}
        </span>
        {valueSuffix ? (
          <span className="text-sm font-normal text-muted-foreground">
            {valueSuffix}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function LawyerDashboardCards({
  area,
  stats,
  lists,
}: {
  area: AppModuleId;
  stats: StaffDashboardStats;
  lists: StaffDashboardLists;
}) {
  const inboxHref = functionHref(area, "inbox");
  const overviewHref = functionHref(area, "inbox-overview");

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DASHBOARD_CARDS.map((card) => (
          <DashboardMetricCard
            key={card.key}
            label={card.label}
            value={stats[card.key]}
            valueSuffix={card.valueSuffix}
            href={
              card.key === "completedThisWeek"
                ? overviewHref
                : `${inboxHref}${card.hrefSuffix}`
            }
            icon={card.icon}
            valueClass={card.valueClass}
            iconClass={card.iconClass}
            cardClass={card.cardClass}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardListCard
          title="Dringende Aufgaben"
          emptyText="Keine dringenden Aufgaben."
          href={inboxHref}
          icon={ClipboardListIcon}
          items={lists.urgentTasks}
          area={area}
        />
      </div>
    </section>
  );
}

function DashboardListCard({
  title,
  emptyText,
  href,
  icon: Icon,
  items,
  area,
}: {
  title: string;
  emptyText: string;
  href: string;
  icon: LucideIcon;
  items: StaffDashboardPreviewItem[];
  area: AppModuleId;
}) {
  const inboxHref = functionHref(area, "inbox");

  return (
    <div className="rounded-none border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <h3 className="text-base font-medium text-foreground">{title}</h3>
        </div>
        <Link
          href={href}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Alle
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/70">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={inboxHref}
                className="flex items-start justify-between gap-3 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.topic}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.senderName} · {priorityLabel(item.priority)}
                  </p>
                </div>
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AreaStartView({
  brandLabel,
  area,
  allowedFunctions = null,
  userId,
  deskRole = null,
  dashboardStats = null,
  dashboardLists = null,
  title,
}: {
  brandLabel: string;
  area: AppModuleId;
  allowedFunctions?: AreaFunctionId[] | null;
  userId: string;
  deskRole?: DeskRoleId | null;
  dashboardStats?: StaffDashboardStats | null;
  dashboardLists?: StaffDashboardLists | null;
  title?: string;
}) {
  const [view, setView] = useState<DeskView>("quick");
  const [usage, setUsage] = useState<Record<string, number>>({});
  const module = APP_MODULES.find((entry) => entry.id === area);
  const available = new Set(
    filterFunctionsByAllowlist(getFunctionsForArea(area), allowedFunctions)
  );
  const pinnedIds = PINNED_FUNCTION_IDS.filter(
    (id) =>
      available.has(id) && id !== "inbox" && id !== "inbox-overview"
  );
  const toolIds = TOOL_FUNCTION_IDS.filter((id) => available.has(id));
  const communicationIds = COMMUNICATION_FUNCTION_IDS.filter((id) =>
    available.has(id)
  );
  const managementIds = MANAGEMENT_FUNCTION_IDS.filter((id) =>
    available.has(id)
  );
  const secretaryNachrichtenIds = (
    ["inbox", "inbox-overview", "staff-messages"] as const
  ).filter((id) => available.has(id));
  const isSecretary = deskRole === "sekretariat";
  const quickIds =
    deskRole === "rechtsanwalt"
      ? buildLawyerQuickViewFunctionIds(available)
      : isSecretary
        ? buildSecretaryQuickViewFunctionIds(available, usage)
        : buildQuickViewFunctionIds(available, usage);
  const showStaffDashboard =
    view === "quick" &&
    (deskRole === "rechtsanwalt" || deskRole === "sekretariat") &&
    dashboardStats !== null &&
    dashboardLists !== null;

  useEffect(() => {
    setUsage(getFunctionUsageCounts(userId, area));
    const stored = window.localStorage.getItem(deskViewStorageKey(area));
    if (stored === "quick" || stored === "all") {
      setView(stored);
    }
  }, [area, userId]);

  function changeView(next: DeskView) {
    setView(next);
    window.localStorage.setItem(deskViewStorageKey(area), next);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12">
      <PageHeader
        title={title ?? module?.label ?? getActiveAreaLabel(area)}
        description={
          view === "quick"
            ? "Anbei finden Sie die wichtigsten Aufgaben und Nachrichten für Ihren Tag."
            : (module?.startDescription ?? "Funktionen für diesen Fach-Bereich.")
        }
        descriptionClassName="max-w-md"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={view === "quick" ? "default" : "outline"}
            className="h-11 rounded-none px-4"
            onClick={() => changeView("quick")}
          >
            Übersicht
          </Button>
          <Button
            type="button"
            variant={view === "all" ? "default" : "outline"}
            className="h-11 rounded-none px-4"
            onClick={() => changeView("all")}
          >
            Alle Funktionen
          </Button>
          {pinnedIds.map((functionId) => {
            const meta = featureMeta[functionId];
            return (
              <Button
                key={functionId}
                asChild
                variant="outline"
                className="h-11 rounded-none px-4"
              >
                <Link href={functionHref(area, functionId)}>
                  <meta.icon data-icon="inline-start" />
                  {FUNCTION_LABELS[functionId]}
                </Link>
              </Button>
            );
          })}
        </div>
      </PageHeader>

      {showStaffDashboard && dashboardStats && dashboardLists ? (
        <LawyerDashboardCards
          area={area}
          stats={dashboardStats}
          lists={dashboardLists}
        />
      ) : null}

      {view === "quick" ? (
        <FeatureSection
          title="Schnellzugriff"
          description="Die wichtigsten Funktionen für Ihren Alltag."
          area={area}
          functionIds={quickIds}
          titleForFunction={(functionId) =>
            functionId === "inbox" ? "Alle Nachrichten" : undefined
          }
        />
      ) : (
        <>
          <FeatureSection
            title="Funktionen"
            description="Werkzeuge dieses Bereichs"
            area={area}
            functionIds={toolIds}
          />

          {isSecretary ? (
            <FeatureSection
              title="Nachrichten"
              description="Eingang, Verlauf und neue Nachrichten"
              area={area}
              functionIds={secretaryNachrichtenIds}
              titleForFunction={(functionId) =>
                functionId === "inbox" ? "Alle Nachrichten" : undefined
              }
            />
          ) : (
            <FeatureSection
              title="Kommunikation"
              description="Nachrichten und Aufträge an Mitarbeiter"
              area={area}
              functionIds={communicationIds}
            />
          )}

          <FeatureSection
            title="Verwaltung"
            description="Mandanten und Akten"
            area={area}
            functionIds={managementIds}
          />
        </>
      )}

      <span className="sr-only">{brandLabel}</span>
    </div>
  );
}
