"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  FileStackIcon,
  FileTextIcon,
  SparklesIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { getActiveAreaLabel } from "@/lib/area/active-area";
import {
  FUNCTION_LABELS,
  getFunctionsForArea,
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
  }
> = {
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
    description:
      "Interne Anleitungen und Prozesse.",
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
};

export function AreaStartView({
  brandLabel,
  area,
}: {
  brandLabel: string;
  area: AppModuleId;
}) {
  const module = APP_MODULES.find((entry) => entry.id === area);
  const functionIds = getFunctionsForArea(area);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12">
      <PageHeader
        title={module?.label ?? getActiveAreaLabel(area)}
        description={
          module?.startDescription ?? "Funktionen für diesen Fach-Bereich."
        }
      />

      <section className="space-y-5">
        <div>
          <h2 className="font-heading text-xl font-medium tracking-tight">
            Funktionen
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Werkzeuge dieses Bereichs
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {functionIds.map((functionId) => {
            const meta = featureMeta[functionId];
            return (
              <Link
                key={functionId}
                href={functionHref(area, functionId)}
                className={cn(
                  "feature-card group block p-6",
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
                    {FUNCTION_LABELS[functionId]}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {meta.description}
                  </p>
                </div>

                <div
                  className={cn(
                    "mt-6 flex items-center gap-1.5 text-sm font-medium transition-transform group-hover:translate-x-0.5",
                    meta.linkClass
                  )}
                >
                  Öffnen
                  <ArrowRightIcon className="size-4" />
                </div>
              </Link>
            );
          })}

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
        </div>
      </section>

      {/* brandLabel reserved for future personalization */}
      <span className="sr-only">{brandLabel}</span>
    </div>
  );
}
