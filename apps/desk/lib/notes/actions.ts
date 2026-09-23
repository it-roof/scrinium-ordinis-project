"use server";

import { revalidatePath } from "next/cache";

import { uploadObject } from "@/lib/storage/s3";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  createUserNoteRow,
  deleteUserNoteRow,
  discardUserNoteObjects,
  getUserNoteById,
  removeUserNoteFileRow,
  updateUserNoteRow,
  userNoteObjectKey,
} from "./storage";
import { buildNotePdf, notePdfFilename } from "./export-pdf";
import type { UserNoteInput, UserNoteUploadedFile } from "./types";
import {
  MAX_FILES_PER_NOTE,
  validateNoteFileMeta,
} from "./types";

function validateInput(input: UserNoteInput): string | null {
  if (!input.title.trim()) {
    return "Bitte einen Titel angeben.";
  }
  if (!input.body.trim()) {
    return "Bitte einen Notiztext angeben.";
  }
  return null;
}

async function assertNotesAccess(userId: string, tenantId: string) {
  return assertUserCanAccessAreaFunction(userId, tenantId, "notes");
}

function parseNoteForm(formData: FormData): UserNoteInput | { error: string } {
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const error = validateInput({ title, body });
  if (error) return { error };
  return { title, body };
}

async function uploadNoteFiles(
  tenantId: string,
  noteId: string,
  rawFiles: File[]
): Promise<UserNoteUploadedFile[] | { error: string; keys: string[] }> {
  if (rawFiles.length > MAX_FILES_PER_NOTE) {
    return {
      error: `Maximal ${MAX_FILES_PER_NOTE} Dateien.`,
      keys: [],
    };
  }

  const uploaded: UserNoteUploadedFile[] = [];
  const keys: string[] = [];

  try {
    for (const file of rawFiles) {
      const metaError = validateNoteFileMeta(file.name, file.size);
      if (metaError) {
        return { error: metaError, keys };
      }

      const fileId = crypto.randomUUID();
      const storageKey = userNoteObjectKey(
        tenantId,
        noteId,
        fileId,
        file.name
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadObject(
        storageKey,
        buffer,
        file.type || "application/octet-stream"
      );
      keys.push(storageKey);
      uploaded.push({
        id: fileId,
        storageKey,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    }
    return uploaded;
  } catch {
    return { error: "Datei-Upload fehlgeschlagen.", keys };
  }
}

export async function createUserNote(formData: FormData) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertNotesAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const parsed = parseNoteForm(formData);
  if ("error" in parsed) {
    return { success: false as const, error: parsed.error };
  }

  const noteId = crypto.randomUUID();
  const rawFiles = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const uploadResult = await uploadNoteFiles(
    user.tenantId,
    noteId,
    rawFiles
  );
  if ("error" in uploadResult) {
    await discardUserNoteObjects(uploadResult.keys);
    return { success: false as const, error: uploadResult.error };
  }

  try {
    const item = await createUserNoteRow(
      user.tenantId,
      user.id,
      parsed,
      uploadResult,
      noteId
    );
    if ("error" in item) {
      await discardUserNoteObjects(uploadResult.map((f) => f.storageKey));
      return { success: false as const, error: item.error };
    }

    revalidatePath("/notizen");
    revalidatePath(`/notizen/${noteId}`);
    return { success: true as const, item };
  } catch {
    await discardUserNoteObjects(uploadResult.map((f) => f.storageKey));
    return {
      success: false as const,
      error: "Notiz konnte nicht angelegt werden.",
    };
  }
}

export async function updateUserNote(id: string, formData: FormData) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertNotesAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const parsed = parseNoteForm(formData);
  if ("error" in parsed) {
    return { success: false as const, error: parsed.error };
  }

  const rawFiles = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const uploadResult = await uploadNoteFiles(user.tenantId, id, rawFiles);
  if ("error" in uploadResult) {
    await discardUserNoteObjects(uploadResult.keys);
    return { success: false as const, error: uploadResult.error };
  }

  try {
    const item = await updateUserNoteRow(
      user.tenantId,
      user.id,
      id,
      parsed,
      uploadResult
    );

    if (!item) {
      await discardUserNoteObjects(uploadResult.map((f) => f.storageKey));
      return { success: false as const, error: "Notiz nicht gefunden." };
    }
    if ("error" in item) {
      await discardUserNoteObjects(uploadResult.map((f) => f.storageKey));
      return { success: false as const, error: item.error };
    }

    revalidatePath("/notizen");
    revalidatePath(`/notizen/${id}`);
    revalidatePath(`/notizen/${id}/bearbeiten`);
    return { success: true as const, item };
  } catch {
    await discardUserNoteObjects(uploadResult.map((f) => f.storageKey));
    return {
      success: false as const,
      error: "Notiz konnte nicht gespeichert werden.",
    };
  }
}

export async function deleteUserNote(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertNotesAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const result = await deleteUserNoteRow(user.tenantId, user.id, id);
  if (!result.deleted) {
    return { success: false as const, error: "Notiz nicht gefunden." };
  }

  await discardUserNoteObjects(result.storageKeys);
  revalidatePath("/notizen");
  revalidatePath(`/notizen/${id}`);

  return { success: true as const };
}

export async function exportUserNotePdf(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertNotesAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const note = await getUserNoteById(user.tenantId, user.id, id);
  if (!note) {
    return { success: false as const, error: "Notiz nicht gefunden." };
  }

  try {
    const buffer = await buildNotePdf(note);
    return {
      success: true as const,
      filename: notePdfFilename(note.title),
      base64: buffer.toString("base64"),
      mimeType: "application/pdf",
    };
  } catch {
    return {
      success: false as const,
      error: "PDF konnte nicht erstellt werden.",
    };
  }
}

export async function removeUserNoteFile(noteId: string, fileId: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertNotesAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const removed = await removeUserNoteFileRow(
    user.tenantId,
    user.id,
    noteId,
    fileId
  );
  if (!removed) {
    return { success: false as const, error: "Datei nicht gefunden." };
  }

  await discardUserNoteObjects([removed.storageKey]);
  revalidatePath("/notizen");
  revalidatePath(`/notizen/${noteId}`);
  revalidatePath(`/notizen/${noteId}/bearbeiten`);

  return { success: true as const };
}
