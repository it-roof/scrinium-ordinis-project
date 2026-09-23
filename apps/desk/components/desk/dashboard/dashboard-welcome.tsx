"use client";

import {
  IconArrowRight,
  IconFolder,
  IconMessages,
  IconPlus,
  IconScale,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import { Library, Sparkles, StickyNote } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { TaskStatsCards } from "@/components/desk/dashboard/task-stats-cards";
import { Button } from "@/components/desk/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/desk/ui/card";
import type { AppModuleId } from "@/lib/modules";
import { updateMyDashboardViewAction } from "@/lib/settings/actions";
import type { StaffDashboardStats } from "@/lib/staff-messages/storage";
import { cn } from "@/lib/utils";

export type DeskView = "quick" | "all";

export type DashboardFunctionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
};

type Props = {
  greeting: string;
  view: DeskView;
  area: AppModuleId;
  stats: StaffDashboardStats;
  quickFunctions: DashboardFunctionItem[];
  functions: DashboardFunctionItem[];
  communicationFunctions: DashboardFunctionItem[];
  managementFunctions: DashboardFunctionItem[];
};

const FUNCTION_META: Record<
  string,
  {
    icon: Icon | typeof Sparkles | typeof Library | typeof StickyNote;
    iconClass: string;
    linkClass: string;
  }
> = {
  prompts: {
    icon: Sparkles,
    iconClass: "bg-violet-100 text-violet-700 ring-violet-200/70",
    linkClass: "text-violet-700/80 group-hover:text-violet-900",
  },
  notes: {
    icon: StickyNote,
    iconClass: "bg-orange-100 text-orange-800 ring-orange-200/70",
    linkClass: "text-orange-800/80 group-hover:text-orange-950",
  },
  "case-facts-analysis": {
    icon: IconScale,
    iconClass: "bg-indigo-100 text-indigo-800 ring-indigo-200/70",
    linkClass: "text-indigo-800/80 group-hover:text-indigo-950",
  },
  "staff-messages": {
    icon: IconPlus,
    iconClass: "bg-sky-100 text-sky-800 ring-sky-200/70",
    linkClass: "text-sky-800/80 group-hover:text-sky-950",
  },
  inbox: {
    icon: IconMessages,
    iconClass: "bg-sky-100 text-sky-800 ring-sky-200/70",
    linkClass: "text-sky-800/80 group-hover:text-sky-950",
  },
  clients: {
    icon: IconUsers,
    iconClass: "bg-amber-100 text-amber-800 ring-amber-200/70",
    linkClass: "text-amber-800/80 group-hover:text-amber-950",
  },
  matters: {
    icon: IconFolder,
    iconClass: "bg-amber-100 text-amber-800 ring-amber-200/70",
    linkClass: "text-amber-800/80 group-hover:text-amber-950",
  },
  "text-blocks": {
    icon: Library,
    iconClass: "bg-emerald-100 text-emerald-800 ring-emerald-200/70",
    linkClass: "text-emerald-800/80 group-hover:text-emerald-950",
  },
};

function FunctionCards({ items }: { items: DashboardFunctionItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const meta = FUNCTION_META[item.id] ?? FUNCTION_META.prompts;
        const Icon = meta.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group block outline-none"
          >
            <Card
              className={cn(
                "relative flex h-full flex-col border-border/80 bg-card py-0 shadow-none",
                "transition-colors duration-200",
                "hover:border-border hover:bg-muted/40",
                "focus-visible:ring-2 focus-visible:ring-ring/40"
              )}
            >
              <CardHeader className="relative flex flex-1 flex-col gap-4 px-5 py-5">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl ring-1",
                    meta.iconClass
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="font-heading text-lg font-medium tracking-tight">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </div>
                <span
                  className={cn(
                    "mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium transition-colors duration-200",
                    meta.linkClass
                  )}
                >
                  Öffnen
                  <IconArrowRight className="size-4" />
                </span>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: DeskView;
  onChange: (next: DeskView) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("quick")}
        className={cn(
          "h-8 rounded-md px-3 text-muted-foreground hover:text-foreground",
          view === "quick" &&
            "bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
        )}
      >
        Schnellzugriff
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("all")}
        className={cn(
          "h-8 rounded-md px-3 text-muted-foreground hover:text-foreground",
          view === "all" &&
            "bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
        )}
      >
        Alle Funktionen
      </Button>
    </div>
  );
}

export function DashboardWelcome({
  greeting,
  view,
  area,
  stats,
  quickFunctions,
  functions,
  communicationFunctions,
  managementFunctions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const showManagementSection = managementFunctions.length > 0;

  function setView(next: DeskView) {
    void updateMyDashboardViewAction(next);
    if (next === "all") {
      router.push(`${pathname}?view=all`);
      return;
    }
    router.push(pathname);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="@container/main mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-12 md:px-6 md:pb-16">
        <header className="flex flex-col gap-6 border-b border-border/15 pt-8 pb-6 md:flex-row md:items-end md:justify-between md:pt-10 md:pb-8">
          <div className="min-w-0 space-y-3">
            <h1 className="font-heading text-3xl font-medium tracking-tight whitespace-nowrap text-foreground md:text-[2.35rem] md:leading-[1.15]">
              {greeting}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">
              Die wichtigsten Kennzahlen und Werkzeuge für Ihren Tag — klar
              strukturiert, sofort greifbar.
            </p>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </header>

        {view === "quick" ? (
          <div className="flex flex-col gap-8 pt-6 md:gap-10 md:pt-8">
            <section>
              <TaskStatsCards area={area} stats={stats} />
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="font-heading text-xl font-medium tracking-tight">
                  Schnellzugriff
                </h2>
              </div>
              <FunctionCards items={quickFunctions} />
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-10 pt-6 md:pt-8">
            {functions.length > 0 ? (
              <section className="space-y-4">
                <div className="space-y-1.5">
                  <h2 className="font-heading text-xl font-medium tracking-tight">
                    Funktionen
                  </h2>
                  <p className="text-base text-muted-foreground">
                    Werkzeuge für Ihren Arbeitsalltag.
                  </p>
                </div>
                <FunctionCards items={functions} />
              </section>
            ) : null}

            {showManagementSection ? (
              <section className="space-y-4">
                <div className="space-y-0.5">
                  <h2 className="font-heading text-xl font-medium tracking-tight">
                    Daten
                  </h2>
                  <p className="text-base text-muted-foreground">
                    {managementFunctions.some((item) => item.id === "matters")
                      ? "Mandanten und Akten verwalten."
                      : "Mandanten anlegen und pflegen."}
                  </p>
                </div>
                <FunctionCards items={managementFunctions} />
              </section>
            ) : null}

            {communicationFunctions.length > 0 ? (
              <section className="space-y-4">
                <div className="space-y-0.5">
                  <h2 className="font-heading text-xl font-medium tracking-tight">
                    Kommunikation
                  </h2>
                  <p className="text-base text-muted-foreground">
                    Aufgaben zuweisen und eigene Aufgaben bearbeiten.
                  </p>
                </div>
                <FunctionCards items={communicationFunctions} />
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
