import {
  BookOpenIcon,
  UserIcon,
  FilePenLineIcon,
  FileStackIcon,
  FileTextIcon,
  FolderOpenIcon,
  ListIcon,
  MailIcon,
  MessagesSquareIcon,
  PlusIcon,
  PrinterIcon,
  ScaleIcon,
  SendIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import type { AreaFunctionId } from "@/lib/area/functions";

export type AreaFeatureMeta = {
  description: string;
  icon: LucideIcon;
  /** Dezente Icon-Fläche */
  iconWrap: string;
  /** Link-Farbe „Öffnen“ */
  linkClass: string;
  /** Hover-Ring */
  tintClass: string;
  /** Weicher Farbhauch in der Ecke */
  glowClass: string;
};

export const AREA_FEATURE_META: Record<AreaFunctionId, AreaFeatureMeta> = {
  inbox: {
    description: "Aufgaben, die bei dir liegen und abzuarbeiten sind.",
    icon: MessagesSquareIcon,
    iconWrap: "bg-amber-50/90 text-amber-800/85 ring-amber-200/45",
    linkClass: "text-amber-800/75 group-hover:text-amber-900",
    tintClass: "hover:ring-amber-300/35",
    glowClass: "bg-amber-300/40",
  },
  "inbox-sent": {
    description: "Aufgaben, die du zugewiesen oder weitergegeben hast.",
    icon: SendIcon,
    iconWrap: "bg-amber-50/80 text-amber-800/80 ring-amber-200/40",
    linkClass: "text-amber-800/70 group-hover:text-amber-900",
    tintClass: "hover:ring-amber-300/30",
    glowClass: "bg-amber-300/35",
  },
  "inbox-overview": {
    description: "Verlauf aller Nachrichten und Aufgaben.",
    icon: ListIcon,
    iconWrap: "bg-amber-50/80 text-amber-800/80 ring-amber-200/40",
    linkClass: "text-amber-800/70 group-hover:text-amber-900",
    tintClass: "hover:ring-amber-300/30",
    glowClass: "bg-amber-300/35",
  },
  clients: {
    description: "Firmen und Privatpersonen mit Akten führen.",
    icon: UserIcon,
    iconWrap: "bg-cyan-50/90 text-cyan-800/85 ring-cyan-200/45",
    linkClass: "text-cyan-800/75 group-hover:text-cyan-900",
    tintClass: "hover:ring-cyan-300/35",
    glowClass: "bg-cyan-300/40",
  },
  matters: {
    description: "Alle Akten im Überblick — nach Mandant und Aktenzeichen.",
    icon: FolderOpenIcon,
    iconWrap: "bg-sky-50/90 text-sky-800/85 ring-sky-200/45",
    linkClass: "text-sky-800/75 group-hover:text-sky-900",
    tintClass: "hover:ring-sky-300/35",
    glowClass: "bg-sky-300/40",
  },
  "compose-letter": {
    description: "Anwaltsschreiben oder Brief entwerfen.",
    icon: FileTextIcon,
    iconWrap: "bg-rose-50/90 text-rose-800/85 ring-rose-200/45",
    linkClass: "text-rose-800/75 group-hover:text-rose-900",
    tintClass: "hover:ring-rose-300/35",
    glowClass: "bg-rose-300/35",
  },
  "compose-email": {
    description:
      "Kurze E-Mail per KI — mit {{TEXT}} zum Ersetzen in Scrinium.",
    icon: MailIcon,
    iconWrap: "bg-sky-50/90 text-sky-800/85 ring-sky-200/45",
    linkClass: "text-sky-800/75 group-hover:text-sky-900",
    tintClass: "hover:ring-sky-300/35",
    glowClass: "bg-sky-300/40",
  },
  "compose-print": {
    description:
      "Markdown-Inhalt einfügen — daraus wird ein PDF erzeugt und im Browser geöffnet.",
    icon: PrinterIcon,
    iconWrap: "bg-amber-50/90 text-amber-800/85 ring-amber-200/45",
    linkClass: "text-amber-800/75 group-hover:text-amber-900",
    tintClass: "hover:ring-amber-300/35",
    glowClass: "bg-amber-300/40",
  },
  "text-blocks": {
    description:
      "Wiederverwendbare Formulierungen für Schreiben, E-Mails und Vorlagen.",
    icon: FileTextIcon,
    iconWrap: "bg-sky-50/90 text-sky-700/85 ring-sky-200/45",
    linkClass: "text-sky-700/80 group-hover:text-sky-900",
    tintClass: "hover:ring-sky-300/35",
    glowClass: "bg-sky-300/40",
  },
  prompts: {
    description: "KI-Prompts speichern, suchen und mit einem Klick kopieren.",
    icon: SparklesIcon,
    iconWrap: "bg-violet-50/90 text-violet-700/85 ring-violet-200/45",
    linkClass: "text-violet-700/80 group-hover:text-violet-900",
    tintClass: "hover:ring-violet-300/35",
    glowClass: "bg-violet-300/35",
  },
  docs: {
    description: "Interne Anleitungen und Prozesse.",
    icon: BookOpenIcon,
    iconWrap: "bg-lime-50/90 text-lime-800/85 ring-lime-200/45",
    linkClass: "text-lime-800/75 group-hover:text-lime-900",
    tintClass: "hover:ring-lime-300/35",
    glowClass: "bg-lime-300/40",
  },
  templates: {
    description:
      "Vollmachten, Fragebögen und weitere Dateien zum Herunterladen.",
    icon: FileStackIcon,
    iconWrap: "bg-emerald-50/90 text-emerald-800/85 ring-emerald-200/45",
    linkClass: "text-emerald-800/75 group-hover:text-emerald-900",
    tintClass: "hover:ring-emerald-300/35",
    glowClass: "bg-emerald-300/40",
  },
  "prompt-kit": {
    description:
      "Fallschilderung eingeben und daraus einen KI-Prompt erzeugen.",
    icon: ScaleIcon,
    iconWrap: "bg-indigo-50/90 text-indigo-800/85 ring-indigo-200/45",
    linkClass: "text-indigo-800/75 group-hover:text-indigo-900",
    tintClass: "hover:ring-indigo-300/35",
    glowClass: "bg-indigo-300/35",
  },
  letters: {
    description: "Entwürfe mit Platzhaltern — als PDF oder Word ausgeben.",
    icon: FilePenLineIcon,
    iconWrap: "bg-rose-50/90 text-rose-800/85 ring-rose-200/45",
    linkClass: "text-rose-800/75 group-hover:text-rose-900",
    tintClass: "hover:ring-rose-300/35",
    glowClass: "bg-rose-300/35",
  },
  "staff-messages": {
    description: "Aufgabe zuweisen und den Ball übergeben.",
    icon: PlusIcon,
    iconWrap: "bg-amber-50/90 text-amber-800/85 ring-amber-200/45",
    linkClass: "text-amber-800/75 group-hover:text-amber-900",
    tintClass: "hover:ring-amber-300/35",
    glowClass: "bg-amber-300/40",
  },
};
