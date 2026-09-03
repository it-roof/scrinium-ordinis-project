"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  UserRoundIcon,
  FilePenLineIcon,
  FileStackIcon,
  FileTextIcon,
  FolderOpenIcon,
  InboxIcon,
  ListIcon,
  MailIcon,
  MessageSquareIcon,
  PrinterIcon,
  ScaleIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getActiveAreaLabel } from "@/lib/area/active-area";
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
  buildQuickViewFunctionIds,
  getFunctionUsageCounts,
} from "@/lib/area/function-usage";
import { functionHref } from "@/lib/area/paths";
import { APP_MODULES, type AppModuleId } from "@/lib/modules";
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
    cta?: string;
  }
> = {
  inbox: {
    description: "Nachrichten und Aufgaben abarbeiten.",
    icon: InboxIcon,
    iconWrap: "bg-amber-100 text-amber-800 ring-amber-200/70",
    linkClass: "text-amber-700",
    cardClass:
      "hover:border-amber-200/80 hover:bg-gradient-to-br hover:from-amber-50/50 hover:to-white",
  },
  "inbox-overview": {
    description: "Alle Nachrichten und Aufgaben im Überblick.",
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
    cta: "Weiter",
  },
  "compose-email": {
    description:
      "Kurze E-Mail per KI — mit {{TEXT}} zum Ersetzen in Scrinium.",
    icon: MailIcon,
    iconWrap: "bg-sky-100 text-sky-800 ring-sky-200/70",
    linkClass: "text-sky-700",
    cardClass:
      "hover:border-sky-200/80 hover:bg-gradient-to-br hover:from-sky-50/50 hover:to-white",
    cta: "Weiter",
  },
  "compose-print": {
    description:
      "Markdown-Inhalt einfügen — daraus wird ein PDF erzeugt und im Browser geöffnet.",
    icon: PrinterIcon,
    iconWrap: "bg-amber-100 text-amber-800 ring-amber-200/70",
    linkClass: "text-amber-700",
    cardClass:
      "hover:border-amber-200/80 hover:bg-gradient-to-br hover:from-amber-50/50 hover:to-white",
    cta: "Weiter",
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
    cta: "Auswählen",
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
}: {
  area: AppModuleId;
  functionId: AreaFunctionId;
}) {
  const meta = featureMeta[functionId];
  return (
    <Link
      href={functionHref(area, functionId)}
      className={cn("feature-card group block p-6", meta.cardClass)}
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
          {FUNCTION_LABELS[functionId]}
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
        {meta.cta ?? "Öffnen"}
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
}: {
  title: string;
  description: string;
  area: AppModuleId;
  functionIds: AreaFunctionId[];
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
          <FeatureCard key={functionId} area={area} functionId={functionId} />
        ))}
      </div>
    </section>
  );
}

export function AreaStartView({
  brandLabel,
  area,
  inboxCount = 0,
  allowedFunctions = null,
  userId,
}: {
  brandLabel: string;
  area: AppModuleId;
  inboxCount?: number;
  allowedFunctions?: AreaFunctionId[] | null;
  userId: string;
}) {
  const [view, setView] = useState<DeskView>("quick");
  const [usage, setUsage] = useState<Record<string, number>>({});
  const module = APP_MODULES.find((entry) => entry.id === area);
  const available = new Set(
    filterFunctionsByAllowlist(getFunctionsForArea(area), allowedFunctions)
  );
  const pinnedIds = PINNED_FUNCTION_IDS.filter((id) => available.has(id));
  const toolIds = TOOL_FUNCTION_IDS.filter((id) => available.has(id));
  const communicationIds = COMMUNICATION_FUNCTION_IDS.filter((id) =>
    available.has(id)
  );
  const managementIds = MANAGEMENT_FUNCTION_IDS.filter((id) =>
    available.has(id)
  );
  const quickIds = buildQuickViewFunctionIds(available, usage);

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
        title={module?.label ?? getActiveAreaLabel(area)}
        description={
          view === "quick"
            ? "Die wichtigsten Wege für den Alltag."
            : (module?.startDescription ?? "Funktionen für diesen Fach-Bereich.")
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={view === "quick" ? "default" : "outline"}
            className="h-11 rounded-none px-4"
            onClick={() => changeView("quick")}
          >
            Schnell-Ansicht
          </Button>
          <Button
            type="button"
            variant={view === "all" ? "default" : "outline"}
            className="h-11 rounded-none px-4"
            onClick={() => changeView("all")}
          >
            Alles-Ansicht
          </Button>
          {pinnedIds.map((functionId) => {
            const meta = featureMeta[functionId];
            const label =
              functionId === "inbox" && inboxCount > 0
                ? `${FUNCTION_LABELS[functionId]} (${inboxCount})`
                : FUNCTION_LABELS[functionId];
            return (
              <Button
                key={functionId}
                asChild
                variant="outline"
                className="h-11 rounded-none px-4"
              >
                <Link href={functionHref(area, functionId)}>
                  <meta.icon data-icon="inline-start" />
                  {label}
                </Link>
              </Button>
            );
          })}
        </div>
      </PageHeader>

      {view === "quick" ? (
        <FeatureSection
          title="Schnell-Ansicht"
          description="Kommunikation und die sechs meistgenutzten Funktionen"
          area={area}
          functionIds={quickIds}
        />
      ) : (
        <>
          <FeatureSection
            title="Funktionen"
            description="Werkzeuge dieses Bereichs"
            area={area}
            functionIds={toolIds}
          />

          <FeatureSection
            title="Kommunikation"
            description="Nachrichten und Aufträge an Mitarbeiter"
            area={area}
            functionIds={communicationIds}
          />

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
