import {
  BookOpenIcon,
  FileStackIcon,
  FolderOpenIcon,
  MessagesSquareIcon,
  SendIcon,
  SparklesIcon,
  StickyNoteIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";

/** Akzentfarbe pro Funktion (Icon-Chip + „Öffnen“). */
export type LabFunctionTone = {
  /** Icon- und Link-Farbe */
  accent: string;
  /** Weiche Chip-Fläche */
  soft: string;
};

/** Gemeinsame Funktions-Karten für Design-Übersichten. */
export type LabFunctionCard = {
  title: string;
  body: string;
  href: string;
  icon: LucideIcon;
  tone: LabFunctionTone;
};

/** Bereich „Funktionen“ — Werkzeuge. */
export const LAB_FUNCTIONS: ReadonlyArray<LabFunctionCard> = [
  {
    title: "KI-Analyse",
    body: "Sachverhalt aus der Akte prüfen.\nEntwurf zur Freigabe erhalten.",
    href: "/r/analyse",
    icon: SparklesIcon,
    tone: {
      accent: "#5b4d8a",
      soft: "color-mix(in srgb, #9b8fd0 22%, transparent)",
    },
  },
  {
    title: "Prompt-Bibliothek",
    body: "Bewährte Prompts speichern.\nSchnell suchen und kopieren.",
    href: "/prompt",
    icon: BookOpenIcon,
    tone: {
      accent: "#6b4580",
      soft: "color-mix(in srgb, #b88fd0 20%, transparent)",
    },
  },
  {
    title: "Notizen",
    body: "Persönliche Notizen nur für Sie.\nTippen oder diktieren.",
    href: "/notizen",
    icon: StickyNoteIcon,
    tone: {
      accent: "#a05a2c",
      soft: "color-mix(in srgb, #e0a070 20%, transparent)",
    },
  },
];

/** Bereich „Daten“ — fachliche Stammdaten. */
export const LAB_DATA: ReadonlyArray<LabFunctionCard> = [
  {
    title: "Mandanten",
    body: "Stammdaten und Kontakte.\nEinwilligungen im Blick behalten.",
    href: "/r/mandanten",
    icon: UserIcon,
    tone: {
      accent: "#2f7a72",
      soft: "color-mix(in srgb, #6dbfb4 20%, transparent)",
    },
  },
  {
    title: "Akten",
    body: "Mandate im Überblick.\nNach Mandant und Zeichen finden.",
    href: "/r/akten",
    icon: FolderOpenIcon,
    tone: {
      accent: "#3d6b8a",
      soft: "color-mix(in srgb, #7eb0d0 22%, transparent)",
    },
  },
];

/** Bereich „Weitere“ — Organisation und Hilfsmittel. */
export const LAB_MORE: ReadonlyArray<LabFunctionCard> = [
  {
    title: "Meine Aufgaben",
    body: "Was bei Ihnen liegt.\nPriorisieren und abarbeiten.",
    href: "/eingang",
    icon: MessagesSquareIcon,
    tone: {
      accent: "#9a6b2f",
      soft: "color-mix(in srgb, #c4a574 22%, transparent)",
    },
  },
  {
    title: "Aufgabe zuweisen",
    body: "Arbeit an Kolleginnen geben.\nBall übergeben und verfolgen.",
    href: "/zuweisen",
    icon: SendIcon,
    tone: {
      accent: "#8b5a3c",
      soft: "color-mix(in srgb, #d4a574 20%, transparent)",
    },
  },
  {
    title: "Textbausteine",
    body: "Wiederkehrende Texte bereithalten.\nIn Schreiben übernehmen.",
    href: "/r/textbausteine",
    icon: FileStackIcon,
    tone: {
      accent: "#3f6b55",
      soft: "color-mix(in srgb, #7cbc9a 20%, transparent)",
    },
  },
];

/** Icon für Funktionskarten — farbige Fläche hinter dem Icon. */
export function LabFunctionIcon({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon;
  tone: LabFunctionTone;
  sharp?: boolean;
  chip?: boolean;
}) {
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[0.75rem]"
      style={{
        background: tone.soft,
        color: tone.accent,
      }}
    >
      <Icon aria-hidden className="size-[1.125rem] shrink-0" strokeWidth={1.6} />
    </span>
  );
}
