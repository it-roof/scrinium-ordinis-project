"use server";

import { revalidatePath } from "next/cache";

import { sendMailWithUserSmtp, sendSentEmailCopyToSelf } from "@/lib/smtp/send";
import { getUserSmtpConnectionConfig } from "@/lib/smtp/storage";
import { sendDelegationAssignmentMail } from "@/lib/mail/delegation-notification";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  assignLetterRow,
  createLetterRow,
  deleteLetterRow,
  getLetterById,
  listLetterColleagues,
  markLetterSentRow,
  setLetterStatusRow,
  updateLetterRow,
  updateSentLetterMatterRow,
} from "./storage";
import {
  findClientMatchesByEmail,
  listClientRecipientOptions as listClientRecipientOptionsRows,
} from "@/lib/clients/storage";
import type {
  ClientEmailMatch,
  ClientRecipientOption,
} from "@/lib/clients/types";
import type { ContentModule } from "@/lib/db/schema";
import {
  isLetterKind,
  isLetterStatus,
  type LetterInput,
  type LetterRecord,
  type LetterStatus,
} from "./types";
import { resolveEmailLetterTitle, listOpenEmailPlaceholders } from "./email-template";

function normalizeLetterInput(input: LetterInput): LetterInput {
  if (input.kind !== "email") {
    return input;
  }
  return {
    ...input,
    title: resolveEmailLetterTitle(input.subject),
  };
}

function validateInput(input: LetterInput): string | null {
  const normalized = normalizeLetterInput(input);
  if (!normalized.title.trim()) {
    return "Bitte einen Titel angeben.";
  }
  if (!isLetterKind(input.kind)) {
    return "Bitte einen gültigen Typ wählen.";
  }
  if (
    !input.subject.trim() &&
    !input.salutation.trim() &&
    !input.body.trim() &&
    !input.closing.trim()
  ) {
    return "Bitte mindestens ein Textfeld ausfüllen.";
  }
  return null;
}

function revalidateLetters() {
  revalidatePath("/", "layout");
}

async function requireLettersUser() {
  const user = await requireSessionUser();
  if (!user) {
    return { error: "Nicht angemeldet." as const, user: null };
  }

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "letters"
  );
  if (denied) {
    return { error: denied, user: null };
  }

  return { error: null, user };
}

export async function createLetter(input: LetterInput) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const validationError = validateInput(input);
  if (validationError) {
    return { success: false as const, error: validationError };
  }

  const normalized = normalizeLetterInput(input);

  try {
    const item = await createLetterRow(user.tenantId, user.id, {
      ...normalized,
      module: "legal",
    });
    revalidateLetters();
    return { success: true as const, item };
  } catch {
    return { success: false as const, error: "Akte nicht gefunden." };
  }
}

export async function updateLetter(id: string, input: LetterInput) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const validationError = validateInput(input);
  if (validationError) {
    return { success: false as const, error: validationError };
  }

  const normalized = normalizeLetterInput(input);

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  if (existing.status === "versendet") {
    return {
      success: false as const,
      error: "Versendete Schreiben können nicht mehr bearbeitet werden.",
    };
  }

  const item = await updateLetterRow(user.tenantId, id, {
    ...normalized,
    module: existing.module,
    recipientEmail: input.recipientEmail ?? existing.recipientEmail,
    ccEmail: input.ccEmail ?? existing.ccEmail,
    matterId:
      input.matterId !== undefined ? input.matterId : existing.matterId,
  });
  if (!item) {
    return {
      success: false as const,
      error: "Schreiben oder Akte nicht gefunden.",
    };
  }

  revalidateLetters();
  return { success: true as const, item };
}

/** Nach Versand nur Akte/Mandant-Zuordnung ändern (E-Mail-Inhalt bleibt gesperrt). */
export async function updateSentLetterAssignment(
  id: string,
  matterId: string | null
) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  if (existing.status !== "versendet") {
    return {
      success: false as const,
      error: "Zuordnung ist nur bei versendeten E-Mails möglich.",
    };
  }

  if (existing.kind !== "email") {
    return {
      success: false as const,
      error: "Nur für versendete E-Mails verfügbar.",
    };
  }

  const normalizedMatterId = matterId?.trim() || null;
  const item = await updateSentLetterMatterRow(
    user.tenantId,
    id,
    normalizedMatterId
  );
  if (!item) {
    return {
      success: false as const,
      error: "Akte nicht gefunden oder Zuordnung fehlgeschlagen.",
    };
  }

  revalidateLetters();
  return { success: true as const, item };
}

export async function deleteLetter(id: string) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  const ok = await deleteLetterRow(user.tenantId, id);
  if (!ok) {
    return { success: false as const, error: "Löschen fehlgeschlagen." };
  }

  revalidateLetters();
  return { success: true as const };
}

export async function getLetterColleaguesAction() {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const items = await listLetterColleagues(user.tenantId);
  return { success: true as const, items };
}

async function notifyAssigneeByMail(input: {
  assigner: { id: string; name: string };
  assignee: { id: string; name: string; email: string };
  letter: Pick<LetterRecord, "title" | "module" | "assignmentNote">;
}) {
  if (input.assignee.id === input.assigner.id) {
    return;
  }

  const result = await sendDelegationAssignmentMail({
    to: input.assignee.email,
    assigneeName: input.assignee.name,
    assignerName: input.assigner.name,
    letterTitle: input.letter.title,
    module: input.letter.module,
    assignmentNote: input.letter.assignmentNote,
  });

  if (!result.ok) {
    console.error("[delegation-mail]", result.error);
  }
}

/**
 * Bidirektional zuweisen.
 * intent "bearbeiten" → Status Entwurf; "pruefung" → Zur Prüfung.
 */
export async function assignLetter(
  id: string,
  assignedTo: string,
  intent: "bearbeiten" | "pruefung" = "bearbeiten",
  options?: {
    matterId?: string | null;
    assignmentNote?: string;
  }
) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  if (!assignedTo.trim()) {
    return { success: false as const, error: "Bitte eine Person wählen." };
  }

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  const colleagues = await listLetterColleagues(user.tenantId, "legal");
  if (!colleagues.some((person) => person.id === assignedTo)) {
    return {
      success: false as const,
      error: "Person hat keinen Zugriff auf diesen Bereich.",
    };
  }

  const status: LetterStatus =
    intent === "pruefung" ? "zur_pruefung" : "entwurf";

  const item = await assignLetterRow(
    user.tenantId,
    id,
    assignedTo,
    status,
    { ...options, assignedBy: user.id }
  );
  if (!item) {
    return {
      success: false as const,
      error: "Person nicht gefunden oder Zuweisung fehlgeschlagen.",
    };
  }

  const assignee = colleagues.find((person) => person.id === assignedTo);
  if (assignee) {
    await notifyAssigneeByMail({
      assigner: { id: user.id, name: user.name ?? "Ein Kollege" },
      assignee,
      letter: item,
    });
  }

  revalidateLetters();
  return { success: true as const, item };
}

/** Delegierung aus dem Sachverhalt-Wizard: Akte + Anweisung + Zuweisung. */
export async function delegateLetterFromWizard(input: {
  letterId: string;
  assignedTo: string;
  matterId?: string | null;
  assignmentNote?: string;
  intent?: "bearbeiten" | "pruefung";
}) {
  return assignLetter(
    input.letterId,
    input.assignedTo,
    input.intent ?? "bearbeiten",
    {
      matterId: input.matterId,
      assignmentNote: input.assignmentNote ?? "",
    }
  );
}

export async function setLetterStatus(id: string, status: LetterStatus) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  if (!isLetterStatus(status) || status === "versendet") {
    return { success: false as const, error: "Status ungültig." };
  }

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  const item = await setLetterStatusRow(user.tenantId, id, status);
  if (!item) {
    return { success: false as const, error: "Status konnte nicht gesetzt werden." };
  }

  revalidateLetters();
  return { success: true as const, item };
}

/** Speichert Felder, weist zu und setzt Status — für Neu-Anlage nach .md-Import. */
export async function createAndAssignLetter(input: {
  letter: LetterInput;
  assignedTo: string;
  intent: "bearbeiten" | "pruefung";
}) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const validationError = validateInput(input.letter);
  if (validationError) {
    return { success: false as const, error: validationError };
  }

  const normalizedLetter = normalizeLetterInput(input.letter);

  if (!input.assignedTo.trim()) {
    return { success: false as const, error: "Bitte eine Person wählen." };
  }

  const colleagues = await listLetterColleagues(user.tenantId, "legal");
  if (!colleagues.some((person) => person.id === input.assignedTo)) {
    return {
      success: false as const,
      error: "Person hat keinen Zugriff auf diesen Bereich.",
    };
  }

  try {
    const created = await createLetterRow(user.tenantId, user.id, {
      ...normalizedLetter,
      module: "legal",
    });

    const status: LetterStatus =
      input.intent === "pruefung" ? "zur_pruefung" : "entwurf";

    const item = await assignLetterRow(
      user.tenantId,
      created.id,
      input.assignedTo,
      status,
      { assignedBy: user.id }
    );
    if (!item) {
      return {
        success: false as const,
        error: "Angelegt, aber Zuweisung fehlgeschlagen.",
        item: created,
      };
    }

    const assignee = colleagues.find((person) => person.id === input.assignedTo);
    if (assignee) {
      await notifyAssigneeByMail({
        assigner: { id: user.id, name: user.name ?? "Ein Kollege" },
        assignee,
        letter: item,
      });
    }

    revalidateLetters();
    return { success: true as const, item };
  } catch {
    return { success: false as const, error: "Akte nicht gefunden." };
  }
}

export async function lookupRecipientClient(
  email: string,
  module: ContentModule
): Promise<
  | { success: true; matches: ClientEmailMatch[] }
  | { success: false; error: string }
> {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false, error: error ?? "Nicht angemeldet." };
  }

  const matches = await findClientMatchesByEmail(
    user.tenantId,
    module,
    email
  );
  return { success: true, matches };
}

export async function listClientRecipientOptions(
  module: ContentModule
): Promise<
  | { success: true; options: ClientRecipientOption[] }
  | { success: false; error: string }
> {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false, error: error ?? "Nicht angemeldet." };
  }

  const options = await listClientRecipientOptionsRows(user.tenantId, module);
  return { success: true, options };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function sendLetter(
  id: string,
  toEmail: string,
  input?: LetterInput
) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  if (existing.status === "versendet") {
    return { success: false as const, error: "Bereits versendet." };
  }

  let letter = existing;

  if (input) {
    const validationError = validateInput(input);
    if (validationError) {
      return { success: false as const, error: validationError };
    }

    const normalized = normalizeLetterInput(input);
    const updated = await updateLetterRow(user.tenantId, id, {
      ...normalized,
      module: existing.module,
      recipientEmail: normalized.recipientEmail ?? existing.recipientEmail,
      ccEmail: normalized.ccEmail ?? existing.ccEmail,
      matterId:
        normalized.matterId !== undefined
          ? normalized.matterId
          : existing.matterId,
    });
    if (!updated) {
      return {
        success: false as const,
        error: "Speichern vor Versand fehlgeschlagen.",
      };
    }
    letter = updated;
  }

  if (letter.kind === "email") {
    const openPlaceholders = listOpenEmailPlaceholders(
      letter.subject,
      letter.body
    );
    if (openPlaceholders.length > 0) {
      return {
        success: false as const,
        error: "Bitte alle Platzhalter ersetzen, bevor Sie senden.",
      };
    }
  }

  const to = toEmail.trim() || letter.recipientEmail.trim();
  if (!to || !isValidEmail(to)) {
    return { success: false as const, error: "Bitte eine gültige E-Mail angeben." };
  }

  const cc = letter.ccEmail.trim();
  if (cc && !isValidEmail(cc)) {
    return {
      success: false as const,
      error: "Bitte eine gültige Kopie-Adresse (CC) angeben.",
    };
  }

  const smtp = await getUserSmtpConnectionConfig(user.tenantId, user.id);
  if (!smtp) {
    return {
      success: false as const,
      error:
        "SMTP ist nicht eingerichtet. Unter Einstellungen ein Konto hinterlegen.",
    };
  }

  const text = [
    letter.salutation,
    "",
    letter.body,
    "",
    letter.closing,
  ]
    .filter((part) => part.trim())
    .join("\n");

  const subject = letter.subject.trim() || letter.title;
  const mailText = text || letter.title;

  try {
    await sendMailWithUserSmtp(smtp, {
      to,
      cc: cc || undefined,
      subject,
      text: mailText,
    });

    if (letter.kind === "email") {
      await sendSentEmailCopyToSelf(smtp, {
        to,
        cc: cc || undefined,
        subject,
        text: mailText,
      });
    }
  } catch {
    return {
      success: false as const,
      error: "Versand fehlgeschlagen. SMTP-Einstellungen prüfen.",
    };
  }

  const item = await markLetterSentRow(user.tenantId, id, to);
  if (!item) {
    return {
      success: false as const,
      error: "Versendet, Status konnte nicht aktualisiert werden.",
    };
  }

  revalidateLetters();
  return { success: true as const, item };
}
