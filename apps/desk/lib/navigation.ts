import {
  BookOpenIcon,
  FileStackIcon,
  FileTextIcon,
  HomeIcon,
  ShieldIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import { areaBasePath, areaFromSlug, slugForArea } from "@/lib/area/paths";
import { APP_MODULES } from "@/lib/modules";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  activeClass: string;
  /** Optional: klickbarer Bereichs-Teil in der Kopfzeile („Steuer / …“). */
  areaHref?: string;
  areaLabel?: string;
  pageLabel?: string;
};

export const navigation: NavItem[] = [
  {
    href: "/",
    label: "Start",
    description: "Startseite des gewählten Bereichs",
    icon: HomeIcon,
    accent: "bg-violet-400/25 text-violet-100",
    activeClass:
      "data-[active=true]:bg-violet-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_290/0.22)]",
  },
  {
    href: "/textbausteine",
    label: "Textbausteine",
    description: "Wiederverwendbare Formulierungen",
    icon: FileTextIcon,
    accent: "bg-sky-400/25 text-sky-100",
    activeClass:
      "data-[active=true]:bg-sky-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_235/0.25)]",
  },
  {
    href: "/prompt",
    label: "Prompt",
    description: "Gespeicherte KI-Prompts",
    icon: SparklesIcon,
    accent: "bg-violet-400/25 text-violet-100",
    activeClass:
      "data-[active=true]:bg-violet-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_290/0.25)]",
  },
  {
    href: "/dokumentation",
    label: "Dokumentation",
    description: "Interne Anleitungen und Prozesse",
    icon: BookOpenIcon,
    accent: "bg-teal-400/25 text-teal-100",
    activeClass:
      "data-[active=true]:bg-teal-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_180/0.25)]",
  },
  {
    href: "/vorlagen",
    label: "Vorlagen",
    description: "Formulare und Dateivorlagen",
    icon: FileStackIcon,
    accent: "bg-lime-400/25 text-lime-100",
    activeClass:
      "data-[active=true]:bg-lime-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.75_0.14_125/0.25)]",
  },
];

export const platformNavItem: NavItem = {
  href: "/platform",
  label: "Plattform",
  description: "Tenants und Benutzer verwalten",
  icon: ShieldIcon,
  accent: "bg-amber-400/25 text-amber-100",
  activeClass:
    "data-[active=true]:bg-amber-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.78_0.1_82/0.28)]",
};

export function getPageMeta(pathname: string): NavItem {
  if (pathname.startsWith("/platform")) {
    return platformNavItem;
  }

  const segments = pathname.split("/").filter(Boolean);

  // /steuer/dokumentation → „Steuer / Dokumentation“
  if (segments.length >= 2 && areaFromSlug(segments[0])) {
    const area = areaFromSlug(segments[0])!;
    const areaLabel =
      APP_MODULES.find((module) => module.id === area)?.label ??
      slugForArea(area);
    const bySegment = navigation.find(
      (item) => item.href === `/${segments[1]}`
    );
    if (bySegment) {
      return {
        ...bySegment,
        label: `${areaLabel} / ${bySegment.label}`,
        description: "",
        areaHref: areaBasePath(area),
        areaLabel,
        pageLabel: bySegment.label,
      };
    }
  }

  // /recht → Startseite (Bereich)
  if (segments.length === 1 && areaFromSlug(segments[0])) {
    return {
      ...navigation[0],
      label: "Startseite",
      description: "",
    };
  }

  const match =
    navigation.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    ) ?? navigation[0];

  return match;
}
