"use client";

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
  MailIcon,
  PrinterIcon,
  ScaleIcon,
  SparklesIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getActiveAreaLabel } from "@/lib/area/active-area";
import {
  FUNCTION_LABELS,
  filterFunctionsByAllowlist,
  getFunctionsForArea,
  MANAGEMENT_FUNCTION_IDS,
  PINNED_FUNCTION_IDS,
  TOOL_FUNCTION_IDS,
  type AreaFunctionId,
} from "@/lib/area/functions";
import { functionHref } from "@/lib/area/paths";
import { APP_MODULES, type AppModuleId } from "@/lib/modules";
import { cn } from "@/lib/utils";

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
    description: "Zugewiesene Schreiben, Prüfungen und offene Aufgaben.",
    icon: InboxIcon,
    iconWrap: "bg-amber-100 text-amber-800 ring-amber-200/70",
    linkClass: "text-amber-700",
    cardClass:
      "hover:border-amber-200/80 hover:bg-gradient-to-br hover:from-amber-50/50 hover:to-white",
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
  showPlaceholder = false,
}: {
  title: string;
  description: string;
  area: AppModuleId;
  functionIds: AreaFunctionId[];
  showPlaceholder?: boolean;
}) {
  if (functionIds.length === 0 && !showPlaceholder) {
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

        {showPlaceholder ? (
          <div
            className="feature-card border-dashed bg-muted/20 p-6 opacity-80"
            aria-disabled
          >
            <div className="flex size-11 items-center justify-center rounded-none bg-slate-100 text-slate-500 ring-1 ring-slate-200/70">
              <WrenchIcon className="size-5" />
            </div>
            <div className="mt-5 space-y-2">
              <h3 className="font-heading text-lg font-medium tracking-tight text-muted-foreground">
                Weitere Funktionen
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Weitere Werkzeuge für diesen Bereich sind in Entwicklung.
              </p>
            </div>
            <p className="mt-6 text-sm font-medium text-muted-foreground/70">
              Demnächst
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AreaStartView({
  brandLabel,
  area,
  inboxCount = 0,
  allowedFunctions = null,
}: {
  brandLabel: string;
  area: AppModuleId;
  inboxCount?: number;
  allowedFunctions?: AreaFunctionId[] | null;
}) {
  const module = APP_MODULES.find((entry) => entry.id === area);
  const available = new Set(
    filterFunctionsByAllowlist(getFunctionsForArea(area), allowedFunctions)
  );
  const pinnedIds = PINNED_FUNCTION_IDS.filter((id) => available.has(id));
  const toolIds = TOOL_FUNCTION_IDS.filter((id) => available.has(id));
  const managementIds = MANAGEMENT_FUNCTION_IDS.filter((id) =>
    available.has(id)
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12">
      <PageHeader
        title={module?.label ?? getActiveAreaLabel(area)}
        description={
          module?.startDescription ?? "Funktionen für diesen Fach-Bereich."
        }
      >
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
      </PageHeader>

      <FeatureSection
        title="Funktionen"
        description="Werkzeuge dieses Bereichs"
        area={area}
        functionIds={toolIds}
        showPlaceholder
      />

      <FeatureSection
        title="Verwaltung"
        description="Mandanten und Akten"
        area={area}
        functionIds={managementIds}
      />

      <span className="sr-only">{brandLabel}</span>
    </div>
  );
}
