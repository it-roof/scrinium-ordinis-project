import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/v1/ui/card";
import type { AppModuleId } from "@/lib/modules";
import type { StaffDashboardStats } from "@/lib/staff-messages/storage";
import { cn } from "@/lib/utils";

type TaskStatsCardsProps = {
  area: AppModuleId;
  stats: StaffDashboardStats;
};

export function TaskStatsCards({ area: _area, stats }: TaskStatsCardsProps) {
  const inboxHref = "/v1/eingang";

  const cards = [
    {
      key: "sofort",
      description: "Sofort",
      value: stats.sofort,
      href: `${inboxHref}?priority=sofort`,
      accent: "rose" as const,
    },
    {
      key: "heute",
      description: "Heute",
      value: stats.heute,
      href: `${inboxHref}?priority=heute`,
      accent: "amber" as const,
    },
    {
      key: "unread",
      description: "Aufgaben",
      value: stats.unread,
      valueSuffix: "ungelesen",
      href: `${inboxHref}?unread=1`,
      accent: "sky" as const,
    },
    {
      key: "completedThisWeek",
      description: "Erledigt",
      value: stats.completedThisWeek,
      valueSuffix: "diese Woche",
      href: `${inboxHref}?filter=erledigt`,
      accent: "emerald" as const,
    },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className="group block outline-none"
        >
          <Card
            data-v1-accent-border={card.accent}
            className={cn(
              "@container/card h-full gap-4 border-border/80 border-l-[5px] bg-card py-5 shadow-none",
              "transition-colors duration-200",
              "hover:bg-muted/40",
              "focus-visible:ring-2 focus-visible:ring-ring/40"
            )}
          >
            <CardHeader className="gap-1.5 px-5">
              <CardDescription className="font-heading text-lg font-medium tracking-tight text-foreground">
                {card.description}
              </CardDescription>
              <CardTitle className="flex items-baseline gap-1.5 font-heading text-2xl leading-none font-medium tracking-tight tabular-nums">
                <span>{card.value}</span>
                {"valueSuffix" in card && card.valueSuffix ? (
                    <span className="text-sm font-normal tracking-normal text-muted-foreground/65 normal-case">
                      {card.valueSuffix}
                    </span>
                ) : null}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
