import Link from "next/link";
import { ArrowRightIcon, FileTextIcon, SparklesIcon } from "lucide-react";

import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const modules = [
  {
    href: "/textbausteine",
    title: "Textbausteine",
    description:
      "Wiederverwendbare Formulierungen für Schreiben, E-Mails und Vorlagen zentral verwalten.",
    icon: FileTextIcon,
    status: "Verfügbar",
    iconWrap: "bg-sky-100 text-sky-700 ring-sky-200/70",
    statusClass: "bg-sky-100 text-sky-800",
    linkClass: "text-sky-700",
    cardClass:
      "hover:border-sky-200/80 hover:bg-gradient-to-br hover:from-sky-50/50 hover:to-white",
  },
  {
    href: "/prompt",
    title: "Prompt",
    description:
      "KI-Prompts speichern, suchen und mit einem Klick in die Zwischenablage kopieren.",
    icon: SparklesIcon,
    status: "Verfügbar",
    iconWrap: "bg-violet-100 text-violet-700 ring-violet-200/70",
    statusClass: "bg-violet-100 text-violet-800",
    linkClass: "text-violet-700",
    cardClass:
      "hover:border-violet-200/80 hover:bg-gradient-to-br hover:from-violet-50/50 hover:to-white",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12">
      <PageHeader
        eyebrow="Internes Kanzlei-Werkzeug"
        title={
          <>
            Willkommen bei <BrandWordmark className="font-medium" />
          </>
        }
        description="Dokumentation, Textbausteine und Arbeitsfunktionen — gebündelt an einem Ort für die gesamte Kanzlei."
      />

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-medium tracking-tight">
              Module
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verfügbare Werkzeuge und Funktionen
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className={cn("feature-card group block p-6", module.cardClass)}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-none ring-1",
                    module.iconWrap
                  )}
                >
                  <module.icon className="size-5" />
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[0.65rem] font-medium tracking-wide uppercase",
                    module.statusClass
                  )}
                >
                  {module.status}
                </span>
              </div>

              <div className="mt-5 space-y-2">
                <h3 className="font-heading text-lg font-medium tracking-tight">
                  {module.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {module.description}
                </p>
              </div>

              <div
                className={cn(
                  "mt-6 flex items-center gap-1.5 text-sm font-medium transition-transform group-hover:translate-x-0.5",
                  module.linkClass
                )}
              >
                Öffnen
                <ArrowRightIcon className="size-4" />
              </div>
            </Link>
          ))}

          <div className="surface-panel flex flex-col justify-between border-dashed border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-teal-50/20 p-6 md:col-span-2">
            <div className="space-y-2">
              <p className="text-[0.68rem] font-medium tracking-[0.16em] text-violet-700/70 uppercase">
                Demnächst
              </p>
              <h3 className="font-heading text-lg font-medium tracking-tight text-muted-foreground">
                Weitere Module
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground/80">
                Checklisten, Vorlagen und weitere Kanzlei-Funktionen folgen
                schrittweise.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card relative overflow-hidden p-6 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-400 via-teal-400 to-amber-400" />
        <div className="pl-3">
          <p className="font-heading text-base font-medium">
            Direkt zu den Textbausteinen
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Formulierungen anlegen, suchen und mit einem Klick kopieren.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="mt-4 bg-primary px-5 shadow-sm shadow-primary/20 sm:mt-0"
        >
          <Link href="/textbausteine">
            Textbausteine öffnen
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
