import {
  BookOpenIcon,
  UserRoundIcon,
  FilePenLineIcon,
  FileStackIcon,
  FileTextIcon,
  FolderOpenIcon,
  HomeIcon,
  InboxIcon,
  ListIcon,
  MailIcon,
  MessageSquareIcon,
  PrinterIcon,
  ScaleIcon,
  SettingsIcon,
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
    label: "Übersicht",
    description: "Übersicht des gewählten Bereichs",
    icon: HomeIcon,
    accent: "bg-violet-400/25 text-violet-100",
    activeClass:
      "data-[active=true]:bg-violet-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_290/0.22)]",
  },
  {
    href: "/eingang",
    label: "Nachrichten",
    description: "Nachrichten und Aufgaben abarbeiten",
    icon: InboxIcon,
    accent: "bg-amber-400/25 text-amber-100",
    activeClass:
      "data-[active=true]:bg-amber-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.78_0.12_85/0.25)]",
  },
  {
    href: "/nachrichten-uebersicht",
    label: "Verlauf",
    description: "Verlauf aller Nachrichten und Aufgaben",
    icon: ListIcon,
    accent: "bg-amber-400/20 text-amber-100",
    activeClass:
      "data-[active=true]:bg-amber-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.78_0.12_85/0.2)]",
  },
  {
    href: "/mandanten",
    label: "Mandanten",
    description: "Firmen und Privatpersonen",
    icon: UserRoundIcon,
    accent: "bg-cyan-400/25 text-cyan-100",
    activeClass:
      "data-[active=true]:bg-cyan-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.1_200/0.25)]",
  },
  {
    href: "/akten",
    label: "Akten",
    description: "Alle Akten im Überblick",
    icon: FolderOpenIcon,
    accent: "bg-sky-400/25 text-sky-100",
    activeClass:
      "data-[active=true]:bg-sky-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.1_220/0.25)]",
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
    label: "Prompt-Bibliothek",
    description: "Gespeicherte KI-Prompts",
    icon: SparklesIcon,
    accent: "bg-violet-400/25 text-violet-100",
    activeClass:
      "data-[active=true]:bg-violet-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_290/0.25)]",
  },
  {
    href: "/prompt-baukasten",
    label: "Sachverhalt verarbeiten",
    description: "Fallschilderung eingeben und daraus einen KI-Prompt erzeugen",
    icon: ScaleIcon,
    accent: "bg-indigo-400/25 text-indigo-100",
    activeClass:
      "data-[active=true]:bg-indigo-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_275/0.25)]",
  },
  {
    href: "/schreiben-erstellen",
    label: "Schreiben erstellen",
    description: "Anwaltsschreiben oder Brief entwerfen",
    icon: FileTextIcon,
    accent: "bg-rose-400/25 text-rose-100",
    activeClass:
      "data-[active=true]:bg-rose-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_20/0.25)]",
  },
  {
    href: "/email-senden",
    label: "E-Mail senden",
    description: "Kurze E-Mail per KI — mit Platzhaltern zum Ersetzen",
    icon: MailIcon,
    accent: "bg-sky-400/25 text-sky-100",
    activeClass:
      "data-[active=true]:bg-sky-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.1_220/0.25)]",
  },
  {
    href: "/dokument-drucken",
    label: "Dokument drucken",
    description: "Markdown einfügen und als PDF im Browser öffnen",
    icon: PrinterIcon,
    accent: "bg-amber-400/25 text-amber-100",
    activeClass:
      "data-[active=true]:bg-amber-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.78_0.12_85/0.25)]",
  },
  {
    href: "/schreiben",
    label: "Schreiben",
    description: "Entwürfe mit Platzhaltern, PDF und Word",
    icon: FilePenLineIcon,
    accent: "bg-rose-400/25 text-rose-100",
    activeClass:
      "data-[active=true]:bg-rose-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.12_20/0.25)]",
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
  {
    href: "/nachrichten-an-mitarbeiter",
    label: "Nachricht an Mitarbeiter",
    description: "Nachricht hinterlassen, Aufgabe erteilen oder ein Dokument senden.",
    icon: MessageSquareIcon,
    accent: "bg-blue-400/25 text-blue-100",
    activeClass:
      "data-[active=true]:bg-blue-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.1_250/0.25)]",
  },
];

export const platformNavItem: NavItem = {
  href: "/platform",
  label: "Plattform",
  description: "Kanzleien und Benutzer verwalten",
  icon: ShieldIcon,
  accent: "bg-amber-400/25 text-amber-100",
  activeClass:
    "data-[active=true]:bg-amber-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.78_0.1_82/0.28)]",
};

export const settingsNavItem: NavItem = {
  href: "/einstellungen",
  label: "Einstellungen",
  description: "",
  icon: SettingsIcon,
  accent: "bg-slate-400/25 text-slate-100",
  activeClass:
    "data-[active=true]:bg-slate-400/10 data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.7_0.02_250/0.25)]",
};

export function getPageMeta(pathname: string): NavItem {
  if (pathname.startsWith("/einstellungen")) {
    return {
      ...settingsNavItem,
      areaHref: "/einstellungen",
      areaLabel: "Konto",
      pageLabel: "Einstellungen",
      description: "",
    };
  }

  if (pathname.startsWith("/platform/tenants/")) {
    return {
      ...platformNavItem,
      areaHref: "/platform",
      areaLabel: "Kanzleien",
      pageLabel: "Details",
      description: "",
    };
  }

  if (pathname.startsWith("/platform")) {
    return {
      ...platformNavItem,
      label: "Kanzleien",
      description: "Mandanten der Plattform",
    };
  }

  const segments = pathname.split("/").filter(Boolean);

  // /steuer/dokumentation → „Steuer / Dokumentation“
  if (segments.length >= 2 && areaFromSlug(segments[0])) {
    const area = areaFromSlug(segments[0])!;
    const areaLabel =
      APP_MODULES.find((module) => module.id === area)?.label ??
      slugForArea(area);
    const pageSegment = segments[1];
    const bySegment = navigation.find(
      (item) => item.href === `/${pageSegment}`
    );
    if (bySegment) {
      const isMatterDetail =
        pageSegment === "akten" && segments.length >= 3;
      const pageLabel = isMatterDetail ? "Akte" : bySegment.label;
      return {
        ...bySegment,
        label: `${areaLabel} / ${pageLabel}`,
        description: "",
        areaHref: areaBasePath(area),
        areaLabel,
        pageLabel,
      };
    }
  }

  // /recht → Übersicht (Bereich)
  if (segments.length === 1 && areaFromSlug(segments[0])) {
    return {
      ...navigation[0],
      label: "Übersicht",
      description: "",
    };
  }

  const match =
    navigation.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) ?? navigation[0];

  return match;
}
