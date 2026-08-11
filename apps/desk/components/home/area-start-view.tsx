"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  FileTextIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getActiveAreaLabel } from "@/lib/area/active-area";
import {
  FUNCTION_LABELS,
  getFunctionsForArea,
  type AreaFunctionId,
} from "@/lib/area/functions";
import { functionHref } from "@/lib/area/paths";
import { APP_MODULES, type AppModuleId } from "@/lib/modules";
import { moduleStyles } from "@/lib/text-blocks/module-styles";
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
      "Interne Anleitungen und Prozesse mit Markdown und Datei-Uploads.",
    icon: BookOpenIcon,
    iconWrap: "bg-lime-100 text-lime-800 ring-lime-200/70",
    linkClass: "text-lime-700",
    cardClass:
      "hover:border-lime-200/80 hover:bg-gradient-to-br hover:from-lime-50/50 hover:to-white",
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
  const styles = moduleStyles[area];
  const functionIds = getFunctionsForArea(area);
  const primaryFunction = functionIds[0];
  const primaryHref = primaryFunction
    ? functionHref(area, primaryFunction)
    : null;

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
            {functionIds.length > 0
              ? "Werkzeuge dieses Bereichs"
              : "Für diesen Bereich sind noch keine Funktionen hinterlegt."}
          </p>
        </div>

        {functionIds.length > 0 ? (
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
          </div>
        ) : null}
      </section>

      {primaryHref && primaryFunction ? (
        <section
          className={cn(
            "surface-card relative overflow-hidden border-l-[3px] p-6 sm:flex sm:items-center sm:justify-between sm:gap-4",
            styles.accent,
            styles.wash
          )}
        >
          <div className="pl-1">
            <p className="font-heading text-base font-medium">
              {FUNCTION_LABELS[primaryFunction]} · {module?.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Direkt zur Hauptfunktion dieses Bereichs.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="mt-4 bg-primary px-5 shadow-sm shadow-primary/20 sm:mt-0"
          >
            <Link href={primaryHref}>
              {FUNCTION_LABELS[primaryFunction]} öffnen
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </section>
      ) : null}

      {/* brandLabel reserved for future personalization */}
      <span className="sr-only">{brandLabel}</span>
    </div>
  );
}
