import type {
  ContentModule,
  StaffMessageEventKind,
  StaffMessageIntent,
  StaffMessagePriority,
} from "@/lib/db/schema";

export type { StaffMessageIntent, StaffMessagePriority, StaffMessageEventKind };

/**
 * Interner Auftrag = Laufzettel (Ball + Absicht).
 * Verben: Anlegen · Übergeben · Abschließen. Kein Chat.
 */

export type StaffTaskPriority = StaffMessagePriority;
export type StaffTaskIntent = StaffMessageIntent;

export type StaffMessageTopicPreset = {
  key: string;
  label: string;
  /** Default-Absicht beim Anlegen mit dieser Vorlage. */
  intent?: StaffMessageIntent;
};

export const STAFF_MESSAGE_TOPIC_PRESETS: StaffMessageTopicPreset[] = [
  { key: "brief-email", label: "Brief / E-Mail schreiben", intent: "erledigen" },
  { key: "bitte-versenden", label: "Bitte versenden", intent: "erledigen" },
  { key: "bitte-nachbessern", label: "Bitte nachbessern", intent: "erledigen" },
  { key: "telefonnotiz", label: "Telefonnotiz / Rückruf", intent: "erledigen" },
  { key: "dokument-pruefen", label: "Dokument zur Prüfung", intent: "pruefen" },
  { key: "notiz", label: "Nur zur Kenntnis", intent: "kenntnis" },
  { key: "warten", label: "Warten auf Extern", intent: "warten" },
];

export const STAFF_MESSAGE_TOPIC_CUSTOM = "custom";

export const STAFF_MESSAGE_PRIORITIES: {
  value: StaffMessagePriority;
  label: string;
}[] = [
  { value: "sofort", label: "Sofort" },
  { value: "heute", label: "Heute" },
  { value: "diese_woche", label: "Diese Woche" },
  { value: "keine", label: "Keine" },
  { value: "andere", label: "Andere" },
];

export const STAFF_MESSAGE_COMPOSE_PRIORITIES = STAFF_MESSAGE_PRIORITIES.filter(
  (entry) => entry.value !== "andere"
);

export const STAFF_MESSAGE_INTENTS: {
  value: StaffMessageIntent;
  label: string;
  hint: string;
}[] = [
  { value: "erledigen", label: "Erledigen", hint: "Mach es fertig" },
  { value: "pruefen", label: "Prüfen", hint: "Schau drüber" },
  { value: "kenntnis", label: "Kenntnis", hint: "Nur zur Info" },
  { value: "warten", label: "Warten", hint: "Nachhalten auf Extern" },
];

export function intentLabel(intent: StaffMessageIntent): string {
  return (
    STAFF_MESSAGE_INTENTS.find((entry) => entry.value === intent)?.label ??
    intent
  );
}

export function priorityLabel(priority: StaffMessagePriority): string {
  return (
    STAFF_MESSAGE_PRIORITIES.find((entry) => entry.value === priority)?.label ??
    priority
  );
}

/** Farbklassen für Prioritäts-Badges und -Buttons. */
export function priorityBadgeClass(priority: StaffMessagePriority): string {
  switch (priority) {
    case "sofort":
      return "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100";
    case "heute":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
    case "diese_woche":
      return "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100";
    case "andere":
      return "border-violet-500/40 bg-violet-500/10 text-violet-950 dark:text-violet-100";
    default:
      return "border-border/70 bg-muted/50 text-foreground";
  }
}

/** Stärkere Farben für die aktive Prioritäts-Auswahl. */
export function priorityActiveClass(priority: StaffMessagePriority): string {
  switch (priority) {
    case "sofort":
      return "border-rose-600 bg-rose-500/25 text-rose-950 shadow-sm dark:border-rose-400 dark:text-rose-50";
    case "heute":
      return "border-amber-600 bg-amber-500/25 text-amber-950 shadow-sm dark:border-amber-400 dark:text-amber-50";
    case "diese_woche":
      return "border-sky-600 bg-sky-500/25 text-sky-950 shadow-sm dark:border-sky-400 dark:text-sky-50";
    case "andere":
      return "border-violet-600 bg-violet-500/25 text-violet-950 shadow-sm dark:border-violet-400 dark:text-violet-50";
    default:
      return "border-foreground/50 bg-muted text-foreground shadow-sm";
  }
}

export function eventKindLabel(kind: StaffMessageEventKind): string {
  switch (kind) {
    case "angelegt":
      return "Angelegt";
    case "uebergeben":
      return "Weitergegeben";
    case "abgeschlossen":
      return "Fertig";
    default:
      return kind;
  }
}

export type StaffMessageColleague = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
};

export type StaffMessageFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type StaffMessageEvent = {
  id: string;
  kind: StaffMessageEventKind;
  actorId: string;
  actorName: string;
  fromBallHolderId: string | null;
  toBallHolderId: string | null;
  toBallHolderName: string | null;
  intent: StaffMessageIntent | null;
  comment: string | null;
  createdAt: string;
};

export type StaffMessageRecord = {
  id: string;
  module: ContentModule;
  createdById: string;
  createdByName: string;
  ballHolderId: string;
  ballHolderName: string;
  previousBallHolderId: string | null;
  previousBallHolderName: string | null;
  topicKey: string;
  topic: string;
  priority: StaffMessagePriority;
  dueDate: string | null;
  intent: StaffMessageIntent;
  body: string;
  matterId: string | null;
  matterTitle: string | null;
  matterClientName: string | null;
  readAt: string | null;
  closedAt: string | null;
  files: StaffMessageFile[];
  events: StaffMessageEvent[];
  createdAt: string;
};

export type StaffTask = StaffMessageRecord;

export type StaffMessageInput = {
  ballHolderId: string;
  topicKey: string;
  topic: string;
  priority: StaffMessagePriority;
  dueDate: string | null;
  intent: StaffMessageIntent;
  body: string;
  module: ContentModule;
  matterId: string | null;
};

export type StaffMatterOption = {
  id: string;
  title: string;
  clientName: string;
  reference: string;
};

export const MAX_STAFF_MESSAGE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_STAFF_MESSAGE = 10;

export function validateStaffMessageFile(file: File): string | null {
  return validateStaffMessageFileMeta(file.name, file.size);
}

export function validateStaffMessageFileMeta(
  filename: string,
  sizeBytes: number
): string | null {
  if (!filename.trim()) {
    return "Dateiname fehlt.";
  }
  if (sizeBytes <= 0) {
    return "Leere Dateien sind nicht erlaubt.";
  }
  if (sizeBytes > MAX_STAFF_MESSAGE_FILE_BYTES) {
    return "Dateien dürfen maximal 50 MB groß sein.";
  }
  return null;
}

export type StaffMessageUploadedFile = {
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isStaffMessagePriority(
  value: string
): value is StaffMessagePriority {
  return STAFF_MESSAGE_PRIORITIES.some((entry) => entry.value === value);
}

export function isStaffMessageIntent(
  value: string
): value is StaffMessageIntent {
  return STAFF_MESSAGE_INTENTS.some((entry) => entry.value === value);
}

export function resolveStaffMessagePriority(
  priorityRaw: string
): StaffMessagePriority | null {
  const trimmed = priorityRaw.trim();
  if (!trimmed) {
    return "keine";
  }
  const byValue = STAFF_MESSAGE_PRIORITIES.find(
    (entry) => entry.value === trimmed
  );
  if (byValue) return byValue.value;
  const byLabel = STAFF_MESSAGE_PRIORITIES.find(
    (entry) => entry.label === trimmed
  );
  return byLabel?.value ?? null;
}

export function resolveStaffMessageIntent(
  raw: string
): StaffMessageIntent | null {
  const trimmed = raw.trim();
  if (!trimmed) return "erledigen";
  if (isStaffMessageIntent(trimmed)) return trimmed;
  const byLabel = STAFF_MESSAGE_INTENTS.find((entry) => entry.label === trimmed);
  return byLabel?.value ?? null;
}

export function resolveStaffMessageDueDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  let iso = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    iso = value;
  } else {
    const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    iso = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }

  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return iso;
}

export function formatStaffMessageDueDate(isoDate: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00`));
}

export function maskGermanDateInput(raw: string, isDeleting = false): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    if (digits.length === 2 && !isDeleting) return `${digits}.`;
    return digits;
  }
  if (digits.length <= 4) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2);
    if (month.length === 2 && !isDeleting) return `${day}.${month}.`;
    return `${day}.${month}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function germanDateToIso(value: string): string {
  return resolveStaffMessageDueDate(value) ?? "";
}

export function isoToGermanDate(isoDate: string): string {
  if (!isoDate) return "";
  return formatStaffMessageDueDate(isoDate);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDateGerman(date: Date): string {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function endOfWorkWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = copy.getDay();
  const daysUntilFriday =
    weekday === 0 ? 5 : weekday <= 5 ? 5 - weekday : 6;
  copy.setDate(copy.getDate() + daysUntilFriday);
  return copy;
}

export function dueDateForStaffMessagePriority(
  priority: StaffMessagePriority
): string {
  const today = new Date();
  const localToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  switch (priority) {
    case "sofort":
    case "heute":
      return formatLocalDateGerman(localToday);
    case "diese_woche":
      return formatLocalDateGerman(endOfWorkWeek(localToday));
    default:
      return "";
  }
}

export function resolveStaffMessageTopic(
  topicKeyRaw: string,
  topicRaw: string
): { topicKey: string; topic: string } | { error: string } {
  const topicKey = topicKeyRaw.trim() || STAFF_MESSAGE_TOPIC_CUSTOM;
  const topic = topicRaw.trim();
  if (topicKey === STAFF_MESSAGE_TOPIC_CUSTOM) {
    if (!topic) return { error: "Bitte einen Betreff angeben." };
    return { topicKey, topic };
  }
  const preset = STAFF_MESSAGE_TOPIC_PRESETS.find(
    (entry) => entry.key === topicKey
  );
  if (!preset) {
    if (!topic) return { error: "Bitte einen Betreff angeben." };
    return { topicKey: STAFF_MESSAGE_TOPIC_CUSTOM, topic };
  }
  return { topicKey: preset.key, topic: topic || preset.label };
}

export function sortStaffMessagesByPriorityThenDate(
  a: StaffMessageRecord,
  b: StaffMessageRecord
): number {
  const order: StaffMessagePriority[] = [
    "sofort",
    "heute",
    "diese_woche",
    "andere",
    "keine",
  ];
  const ai = order.indexOf(a.priority);
  const bi = order.indexOf(b.priority);
  if (ai !== bi) return ai - bi;
  return b.createdAt.localeCompare(a.createdAt);
}

/** Handoff-Vorlagen (setzen Absicht + Vorschlagstext). */
export const HANDOFF_PRESETS: {
  key: string;
  label: string;
  intent: StaffMessageIntent;
  comment: string;
}[] = [
  {
    key: "zur-pruefung",
    label: "Zur Prüfung",
    intent: "pruefen",
    comment: "Bitte prüfen.",
  },
  {
    key: "bitte-versenden",
    label: "Bitte versenden",
    intent: "erledigen",
    comment: "Bitte versenden.",
  },
  {
    key: "bitte-nachbessern",
    label: "Bitte nachbessern",
    intent: "erledigen",
    comment: "Bitte nachbessern.",
  },
  {
    key: "warten",
    label: "Warten auf Extern",
    intent: "warten",
    comment: "Warte auf Rückmeldung von Extern.",
  },
];
