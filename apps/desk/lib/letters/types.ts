import type { ContentModule, LetterStatus } from "@/lib/db/schema";

export const LETTER_KINDS = [
  "schreiben",
  "email",
  "recherche",
  "aktennotiz",
  "vermerk",
] as const;

export type LetterKind = (typeof LETTER_KINDS)[number];

export const LETTER_KIND_LABELS: Record<LetterKind, string> = {
  schreiben: "Schreiben",
  email: "E-Mail",
  recherche: "Recherche-Vermerk",
  aktennotiz: "Aktennotiz",
  /** @deprecated Altbestand — UI zeigt „Aktennotiz“ */
  vermerk: "Aktennotiz",
};

export const LETTER_STATUSES = [
  "entwurf",
  "zur_pruefung",
  "freigegeben",
  "versendet",
] as const satisfies readonly LetterStatus[];

export type { LetterStatus };

export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = {
  entwurf: "Entwurf",
  zur_pruefung: "Zur Prüfung",
  freigegeben: "Freigegeben",
  versendet: "Versendet",
};

/** Was im Eingang als nächste Aufgabe angezeigt wird. */
export const INBOX_ACTION_LABELS: Record<
  Exclude<LetterStatus, "versendet">,
  string
> = {
  entwurf: "Bearbeiten",
  zur_pruefung: "Prüfen / freigeben",
  freigegeben: "Versenden",
};

export type InboxItem = {
  id: string;
  title: string;
  kind: LetterKind;
  kindLabel: string;
  subject: string;
  status: Exclude<LetterStatus, "versendet">;
  statusLabel: string;
  actionLabel: string;
  assignedByName: string | null;
  matterId: string | null;
  matterTitle: string | null;
  clientName: string | null;
  assignmentNote: string;
  updatedAt: string;
};

export type LetterColleague = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
};

export type LetterRecord = {
  id: string;
  title: string;
  kind: LetterKind;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  module: ContentModule;
  status: LetterStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string | null;
  matterId: string | null;
  matterTitle: string | null;
  clientName: string | null;
  recipientEmail: string;
  ccEmail: string;
  assignmentNote: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LetterInput = {
  title: string;
  kind: LetterKind;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  module: ContentModule;
  recipientEmail?: string;
  ccEmail?: string;
  matterId?: string | null;
  assignmentNote?: string;
};

export function isLetterKind(value: string): value is LetterKind {
  return LETTER_KINDS.includes(value as LetterKind);
}

export function isLetterStatus(value: string): value is LetterStatus {
  return (LETTER_STATUSES as readonly string[]).includes(value);
}

/** Kinds, die im Editor-Dropdown angeboten werden (ohne Altbestand). */
export const LETTER_KIND_OPTIONS = [
  "schreiben",
  "email",
  "recherche",
  "aktennotiz",
] as const satisfies readonly LetterKind[];
