"use server";

import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import { letterFilename } from "./document-model";
import { buildLetterDocx } from "./export-docx";
import { buildLetterPdf } from "./export-pdf";
import { getLetterById } from "./storage";

export async function exportLetterPdf(id: string) {
  const user = await requireSessionUser();
  if (!user) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "letters"
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const letter = await getLetterById(user.tenantId, id);
  if (!letter) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  const buffer = await buildLetterPdf(letter);
  return {
    success: true as const,
    filename: letterFilename(letter.title, "pdf"),
    base64: buffer.toString("base64"),
    mimeType: "application/pdf",
  };
}

export async function exportLetterDocx(id: string) {
  const user = await requireSessionUser();
  if (!user) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "letters"
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const letter = await getLetterById(user.tenantId, id);
  if (!letter) {
    return { success: false as const, error: "Schreiben nicht gefunden." };
  }

  const buffer = await buildLetterDocx(letter);
  return {
    success: true as const,
    filename: letterFilename(letter.title, "docx"),
    base64: buffer.toString("base64"),
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}
