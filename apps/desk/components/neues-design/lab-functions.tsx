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

/** Gemeinsame Funktions-Karten für Design-Übersichten. */
export const LAB_FUNCTIONS: ReadonlyArray<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Meine Aufgaben",
    body: "Was bei Ihnen liegt und abzuarbeiten ist.",
    icon: MessagesSquareIcon,
  },
  {
    title: "Aufgabe zuweisen",
    body: "Arbeit an Kolleginnen und Kollegen geben.",
    icon: SendIcon,
  },
  {
    title: "Akten",
    body: "Mandate im Überblick — nach Mandant und Zeichen.",
    icon: FolderOpenIcon,
  },
  {
    title: "Mandanten",
    body: "Stammdaten, Kontakte und Einwilligungen.",
    icon: UserIcon,
  },
  {
    title: "KI-Analyse",
    body: "Sachverhalt prüfen und Entwurf erhalten.",
    icon: SparklesIcon,
  },
  {
    title: "Prompt-Bibliothek",
    body: "Bewährte Formulierungen bereithalten.",
    icon: BookOpenIcon,
  },
  {
    title: "Notizen",
    body: "Persönliche Notizen — nur für Sie.",
    icon: StickyNoteIcon,
  },
  {
    title: "Textbausteine",
    body: "Wiederkehrende Texte übernehmen.",
    icon: FileStackIcon,
  },
];

/** Icon für Funktionskarten — wie im freigegebenen v1-Alba-Manrope. */
export function LabFunctionIcon({
  icon: Icon,
}: {
  icon: LucideIcon;
  sharp?: boolean;
  chip?: boolean;
}) {
  return (
    <Icon
      aria-hidden
      className="size-5 shrink-0"
      strokeWidth={1.5}
      style={{ color: "var(--b-ink)" }}
    />
  );
}
