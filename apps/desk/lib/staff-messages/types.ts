import type {
  ContentModule,
  StaffMessagePriority,
  StaffMessageStatus,
} from "@/lib/db/schema";

/**
 * Domain: interne Kanzlei-**Aufgabe** (Empfänger, Status, Priorität, Fälligkeit).
 * UI: „Nachricht“ / „Nachrichten“ — keine zweite Entität.
 *
 * Historische Identifier `StaffMessage*` bleiben als Alias bestehen
 * (Tabelle `staff_messages`); neuer Code bevorzugt `StaffTask*`.
 */

export type StaffTaskPriority = StaffMessagePriority;
export type StaffTaskStatus = StaffMessageStatus;

export type StaffMessageTopicPreset = {
  key: string;
  label: string;
};

export type StaffTaskTopicPreset = StaffMessageTopicPreset;

export const STAFF_MESSAGE_TOPIC_PRESETS: StaffMessageTopicPreset[] = [
  { key: "brief-email", label: "Brief / E-Mail schreiben" },
  { key: "aufgabe", label: "Aufgabe erledigen" },
  { key: "dokument", label: "Dokument weiterleiten" },
  { key: "notiz", label: "Notiz / Info" },
  { key: "rueckruf", label: "Rückrufbitte" },
  { key: "termin", label: "Termin vereinbaren" },
  { key: "termin-mandant", label: "Termin mit Mandant" },
  { key: "rueckruf-mandant", label: "Rückruf für Mandant" },
  { key: "meeting", label: "Internes Meeting" },
  { key: "erinnerung-frist", label: "Erinnerung / Frist" },
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

export const STAFF_MESSAGE_STATUSES: {
  value: StaffMessageStatus;
  label: string;
}[] = [
  { value: "offen", label: "Offen" },
  { value: "spaeter", label: "Später" },
  { value: "erledigt", label: "Erledigt" },
  { value: "entfaellt", label: "Entfällt" },
];

/** Im Eingang sichtbar (ohne Entfällt — das nur im Verlauf). */
export const STAFF_MESSAGE_INBOX_STATUSES: StaffMessageStatus[] = [
  "offen",
  "spaeter",
  "erledigt",
];

/** Noch aktiv zu bearbeiten (Kennzahlen, Badge). */
export const STAFF_MESSAGE_ACTIVE_STATUSES: StaffMessageStatus[] = [
  "offen",
  "spaeter",
];

export const STAFF_TASK_STATUSES = STAFF_MESSAGE_STATUSES;
export const STAFF_TASK_PRIORITIES = STAFF_MESSAGE_PRIORITIES;
export const STAFF_TASK_INBOX_STATUSES = STAFF_MESSAGE_INBOX_STATUSES;
export const STAFF_TASK_ACTIVE_STATUSES = STAFF_MESSAGE_ACTIVE_STATUSES;

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

export type StaffMessageReply = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type StaffMessageRecord = {
  id: string;
  module: ContentModule;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  topicKey: string;
  topic: string;
  priority: StaffMessagePriority;
  dueDate: string | null;
  status: StaffMessageStatus;
  body: string;
  readAt: string | null;
  completedAt: string | null;
  files: StaffMessageFile[];
  replies: StaffMessageReply[];
  createdAt: string;
};

/** Domain-Name für dieselbe Entität (UI: Nachricht). */
export type StaffTask = StaffMessageRecord;

export type StaffMessageInput = {
  recipientId: string;
  topicKey: string;
  topic: string;
  priority: StaffMessagePriority;
  dueDate: string | null;
  body: string;
  module: ContentModule;
};

export type StaffTaskInput = StaffMessageInput;

/** Max. 50 MB pro Datei — alle Typen erlaubt. */
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

export function resolveStaffMessagePriority(
  priorityRaw: string
): StaffMessagePriority | null {
  const trimmed = priorityRaw.trim();
  if (!trimmed) {
    return null;
  }

  const byValue = STAFF_MESSAGE_PRIORITIES.find(
    (entry) => entry.value === trimmed
  );
  if (byValue) {
    return byValue.value;
  }

  const byLabel = STAFF_MESSAGE_PRIORITIES.find(
    (entry) => entry.label === trimmed
  );
  return byLabel?.value ?? null;
}

export function isStaffMessageStatus(
  value: string
): value is StaffMessageStatus {
  return STAFF_MESSAGE_STATUSES.some((entry) => entry.value === value);
}

export function resolveStaffMessageDueDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  let iso = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    iso = value;
  } else {
    const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) {
      return null;
    }
    iso = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }

  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
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

/** Tipp-Maske TT.MM.JJJJ — Punkte nach Tag und Monat. */
export function maskGermanDateInput(raw: string, isDeleting = false): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    if (digits.length === 2 && !isDeleting) {
      return `${digits}.`;
    }
    return digits;
  }
  if (digits.length <= 4) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2);
    if (month.length === 2 && !isDeleting) {
      return `${day}.${month}.`;
    }
    return `${day}.${month}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function germanDateToIso(value: string): string {
  return resolveStaffMessageDueDate(value) ?? "";
}

export function isoToGermanDate(isoDate: string): string {
  if (!isoDate) {
    return "";
  }
  return formatStaffMessageDueDate(isoDate);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDateGerman(date: Date): string {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** Freitag der laufenden Arbeitswoche; am Wochenende der nächste Freitag. */
function endOfWorkWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = copy.getDay(); // 0=So … 5=Fr … 6=Sa
  const daysUntilFriday =
    weekday === 0 ? 5 : weekday <= 5 ? 5 - weekday : 6;
  copy.setDate(copy.getDate() + daysUntilFriday);
  return copy;
}

/** Fälligkeitsdatum zur Priorität — deutsches Formularformat TT.MM.JJJJ. */
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
  topicRaw: string
): { topicKey: string; topic: string } | null {
  const topic = topicRaw.trim();
  if (!topic) {
    return null;
  }

  const preset = STAFF_MESSAGE_TOPIC_PRESETS.find(
    (entry) => entry.label === topic || entry.key === topic
  );
  if (preset) {
    return { topicKey: preset.key, topic: preset.label };
  }

  return { topicKey: STAFF_MESSAGE_TOPIC_CUSTOM, topic };
}

export function priorityLabel(priority: StaffMessagePriority): string {
  return (
    STAFF_MESSAGE_PRIORITIES.find((entry) => entry.value === priority)?.label ??
    priority
  );
}

/** Sortierung Eingang: Sofort → Heute → Diese Woche → Andere (nach Fälligkeit) → Keine. */
export function compareStaffMessagesByPriority(
  a: Pick<StaffMessageRecord, "priority" | "dueDate" | "createdAt">,
  b: Pick<StaffMessageRecord, "priority" | "dueDate" | "createdAt">
): number {
  const rank = (priority: StaffMessagePriority) => {
    switch (priority) {
      case "sofort":
        return 0;
      case "heute":
        return 1;
      case "diese_woche":
        return 2;
      case "andere":
        return 3;
      case "keine":
      default:
        return 4;
    }
  };

  const byPriority = rank(a.priority) - rank(b.priority);
  if (byPriority !== 0) {
    return byPriority;
  }

  const dueA = a.dueDate ?? "";
  const dueB = b.dueDate ?? "";
  if (dueA && dueB && dueA !== dueB) {
    return dueA.localeCompare(dueB);
  }
  if (dueA && !dueB) {
    return -1;
  }
  if (!dueA && dueB) {
    return 1;
  }

  return b.createdAt.localeCompare(a.createdAt);
}

export function statusLabel(status: StaffMessageStatus): string {
  return (
    STAFF_MESSAGE_STATUSES.find((entry) => entry.value === status)?.label ??
    status
  );
}
