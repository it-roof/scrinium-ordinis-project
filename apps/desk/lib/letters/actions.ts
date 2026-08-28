"use server";

import { revalidatePath } from "next/cache";

import { sendMailWithUserSmtp } from "@/lib/smtp/send";
import { getUserSmtpConnectionConfig } from "@/lib/smtp/storage";
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
} from "./storage";
import {
  isLetterKind,
  isLetterStatus,
  type LetterInput,
  type LetterStatus,
} from "./types";

function validateInput(input: LetterInput): string | null {
  if (!input.title.trim()) {
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

  try {
    const item = await createLetterRow(user.tenantId, user.id, {
      ...input,
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

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  const item = await updateLetterRow(user.tenantId, id, {
    ...input,
    module: existing.module,
    recipientEmail: input.recipientEmail ?? existing.recipientEmail,
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
    options
  );
  if (!item) {
    return {
      success: false as const,
      error: "Person nicht gefunden oder Zuweisung fehlgeschlagen.",
    };
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
      ...input.letter,
      module: "legal",
    });

    const status: LetterStatus =
      input.intent === "pruefung" ? "zur_pruefung" : "entwurf";

    const item = await assignLetterRow(
      user.tenantId,
      created.id,
      input.assignedTo,
      status
    );
    if (!item) {
      return {
        success: false as const,
        error: "Angelegt, aber Zuweisung fehlgeschlagen.",
        item: created,
      };
    }

    revalidateLetters();
    return { success: true as const, item };
  } catch {
    return { success: false as const, error: "Akte nicht gefunden." };
  }
}

export async function sendLetter(id: string, toEmail: string) {
  const { error, user } = await requireLettersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const to = toEmail.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { success: false as const, error: "Bitte eine gültige E-Mail angeben." };
  }

  const existing = await getLetterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
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
    existing.salutation,
    "",
    existing.body,
    "",
    existing.closing,
  ]
    .filter((part) => part.trim())
    .join("\n");

  try {
    await sendMailWithUserSmtp(smtp, {
      to,
      subject: existing.subject.trim() || existing.title,
      text: text || existing.title,
    });
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
