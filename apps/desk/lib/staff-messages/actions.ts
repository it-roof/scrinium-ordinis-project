"use server";

import { revalidatePath } from "next/cache";

import { areaOwnsFunction } from "@/lib/area/functions";
import type { ContentModule } from "@/lib/db/schema";
import { isAppModuleId } from "@/lib/modules";
import { getSignedPutUrl, uploadObject } from "@/lib/storage/s3";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  addStaffMessageReplyRow,
  createStaffMessageRow,
  discardStaffMessageObjects,
  getStaffMessageFileById,
  listStaffColleagues,
  listStaffMessages,
  markStaffMessageReadRow,
  setStaffMessageStatusRow,
  staffMessageObjectKey,
} from "./storage";
import {
  isStaffMessageStatus,
  MAX_FILES_PER_STAFF_MESSAGE,
  resolveStaffMessageDueDate,
  resolveStaffMessagePriority,
  resolveStaffMessageTopic,
  validateStaffMessageFileMeta,
  type StaffMessageInput,
  type StaffMessageUploadedFile,
} from "./types";

function revalidateStaffMessages() {
  revalidatePath("/", "layout");
}

async function requireStaffMessagesUser() {
  const user = await requireSessionUser();
  if (!user) {
    return { error: "Nicht angemeldet." as const, user: null };
  }

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "staff-messages"
  );
  if (denied) {
    return { error: denied, user: null };
  }

  return { error: null, user };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function parseUploadedFiles(
  raw: string,
  tenantId: string,
  messageId: string
): { files?: StaffMessageUploadedFile[]; error?: string } {
  if (!raw.trim()) {
    return { files: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Ungültige Dateiangaben." };
  }

  if (!Array.isArray(parsed)) {
    return { error: "Ungültige Dateiangaben." };
  }

  if (parsed.length > MAX_FILES_PER_STAFF_MESSAGE) {
    return {
      error: `Maximal ${MAX_FILES_PER_STAFF_MESSAGE} Dateien pro Nachricht.`,
    };
  }

  const files: StaffMessageUploadedFile[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      return { error: "Ungültige Dateiangaben." };
    }
    const item = entry as Record<string, unknown>;
    const id = String(item.id ?? "");
    const filename = String(item.filename ?? "");
    const mimeType =
      String(item.mimeType ?? "application/octet-stream").trim() ||
      "application/octet-stream";
    const sizeBytes = Number(item.sizeBytes);
    const storageKey = String(item.storageKey ?? "");

    if (!isUuid(id) || files.some((file) => file.id === id)) {
      return { error: "Ungültige Dateiangaben." };
    }

    if (
      !Number.isInteger(sizeBytes) ||
      mimeType.length > 200 ||
      filename.length > 255
    ) {
      return { error: "Ungültige Dateiangaben." };
    }

    const metaError = validateStaffMessageFileMeta(filename, sizeBytes);
    if (metaError) {
      return { error: metaError };
    }

    const expectedKey = staffMessageObjectKey(tenantId, messageId, id, filename);
    if (storageKey !== expectedKey) {
      return { error: "Ungültiger Dateipfad." };
    }

    files.push({
      id,
      storageKey,
      filename: filename.trim(),
      mimeType,
      sizeBytes,
    });
  }

  return { files };
}

function parseInput(formData: FormData): {
  input?: StaffMessageInput;
  error?: string;
} {
  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const topicRaw = String(formData.get("topic") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const moduleRaw = String(formData.get("module") ?? "general").trim();

  if (!recipientId) {
    return { error: "Bitte einen Mitarbeiter wählen." };
  }

  const topic = resolveStaffMessageTopic(topicRaw);
  if (!topic) {
    return { error: "Bitte einen Betreff eingeben oder auswählen." };
  }

  const priority = resolveStaffMessagePriority(priorityRaw);
  if (!priority) {
    return { error: "Bitte eine Priorität eingeben oder auswählen." };
  }

  if (dueDateRaw && !resolveStaffMessageDueDate(dueDateRaw)) {
    return { error: "Bitte ein gültiges Datum wählen." };
  }

  const dueDate = resolveStaffMessageDueDate(dueDateRaw);

  if (!body.trim()) {
    return { error: "Bitte eine Nachricht eingeben." };
  }

  if (!isAppModuleId(moduleRaw)) {
    return { error: "Ungültiger Bereich." };
  }

  if (!areaOwnsFunction(moduleRaw, "staff-messages")) {
    return { error: "Nachrichten sind in diesem Bereich nicht verfügbar." };
  }

  return {
    input: {
      recipientId,
      topicKey: topic.topicKey,
      topic: topic.topic,
      priority,
      dueDate,
      body,
      module: moduleRaw as ContentModule,
    },
  };
}

export async function getStaffColleaguesAction() {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const items = await listStaffColleagues(user.tenantId, user.id);
  return { success: true as const, items };
}

export async function prepareStaffMessageUploads(
  files: { filename: string; sizeBytes: number; mimeType: string }[]
) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  if (files.length > MAX_FILES_PER_STAFF_MESSAGE) {
    return {
      success: false as const,
      error: `Maximal ${MAX_FILES_PER_STAFF_MESSAGE} Dateien pro Nachricht.`,
    };
  }

  const messageId = crypto.randomUUID();
  const uploads: {
    id: string;
    storageKey: string;
    uploadUrl: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }[] = [];

  for (const file of files) {
    const metaError = validateStaffMessageFileMeta(file.filename, file.sizeBytes);
    if (metaError) {
      return { success: false as const, error: metaError };
    }

    const id = crypto.randomUUID();
    const mimeType =
      file.mimeType.trim() || "application/octet-stream";
    const storageKey = staffMessageObjectKey(
      user.tenantId,
      messageId,
      id,
      file.filename
    );
    const uploadUrl = await getSignedPutUrl(storageKey, mimeType, 900);

    uploads.push({
      id,
      storageKey,
      uploadUrl,
      filename: file.filename.trim(),
      mimeType,
      sizeBytes: file.sizeBytes,
    });
  }

  return { success: true as const, messageId, uploads };
}

export async function abortStaffMessageUploads(
  messageId: string,
  storageKeys: string[]
) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  if (!isUuid(messageId) || !Array.isArray(storageKeys)) {
    return { success: false as const, error: "Ungültige Dateiangaben." };
  }

  await discardStaffMessageObjects(
    user.tenantId,
    messageId,
    storageKeys.filter((key) => typeof key === "string").slice(0, MAX_FILES_PER_STAFF_MESSAGE)
  );
  return { success: true as const };
}

export async function createStaffMessage(formData: FormData) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const messageIdRaw = String(formData.get("messageId") ?? "").trim();
  const messageId = messageIdRaw || crypto.randomUUID();
  if (!isUuid(messageId)) {
    return { success: false as const, error: "Ungültige Nachricht." };
  }

  const parsed = parseInput(formData);
  if (parsed.error || !parsed.input) {
    return { success: false as const, error: parsed.error ?? "Ungültige Eingabe." };
  }

  const rawFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (rawFiles.length > MAX_FILES_PER_STAFF_MESSAGE) {
    return {
      success: false as const,
      error: `Maximal ${MAX_FILES_PER_STAFF_MESSAGE} Dateien pro Nachricht.`,
    };
  }

  const uploadedFiles: StaffMessageUploadedFile[] = [];

  try {
    for (const file of rawFiles) {
      const metaError = validateStaffMessageFileMeta(file.name, file.size);
      if (metaError) {
        throw new Error(metaError);
      }

      const id = crypto.randomUUID();
      const mimeType =
        file.type.trim() || "application/octet-stream";
      const storageKey = staffMessageObjectKey(
        user.tenantId,
        messageId,
        id,
        file.name
      );
      const buffer = new Uint8Array(await file.arrayBuffer());
      await uploadObject(storageKey, buffer, mimeType);
      uploadedFiles.push({
        id,
        storageKey,
        filename: file.name.trim(),
        mimeType,
        sizeBytes: file.size,
      });
    }
  } catch (uploadError) {
    await discardStaffMessageObjects(
      user.tenantId,
      messageId,
      uploadedFiles.map((file) => file.storageKey)
    );
    const message =
      uploadError instanceof Error && uploadError.message
        ? uploadError.message
        : "Datei konnte nicht hochgeladen werden.";
    return { success: false as const, error: message };
  }

  // Legacy: bereits vorab hochgeladene Keys (Direkt-Upload), falls noch gesetzt
  if (uploadedFiles.length === 0) {
    const uploaded = parseUploadedFiles(
      String(formData.get("uploadedFiles") ?? ""),
      user.tenantId,
      messageId
    );
    if (uploaded.error) {
      return {
        success: false as const,
        error: uploaded.error,
      };
    }
    if (uploaded.files) {
      uploadedFiles.push(...uploaded.files);
    }
  }

  const result = await createStaffMessageRow(
    user.tenantId,
    user.id,
    parsed.input,
    uploadedFiles,
    messageId
  );

  if (result.error || !result.message) {
    await discardStaffMessageObjects(
      user.tenantId,
      messageId,
      uploadedFiles.map((file) => file.storageKey)
    );
    return {
      success: false as const,
      error: result.error ?? "Nachricht konnte nicht gesendet werden.",
    };
  }

  revalidateStaffMessages();
  return { success: true as const, item: result.message };
}

export async function markStaffMessageRead(id: string) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const item = await markStaffMessageReadRow(user.tenantId, user.id, id);
  if (!item) {
    return { success: false as const, error: "Nachricht nicht gefunden." };
  }

  revalidateStaffMessages();
  return { success: true as const, item };
}

export async function replyToStaffMessage(id: string, body: string) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { success: false as const, error: "Bitte eine Rückmeldung eingeben." };
  }

  const item = await addStaffMessageReplyRow(
    user.tenantId,
    user.id,
    id,
    trimmed
  );
  if (!item) {
    return { success: false as const, error: "Nachricht nicht gefunden." };
  }

  revalidateStaffMessages();
  return { success: true as const, item };
}

export async function setStaffMessageStatus(id: string, status: string) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  if (!isStaffMessageStatus(status)) {
    return { success: false as const, error: "Ungültiger Status." };
  }

  const item = await setStaffMessageStatusRow(
    user.tenantId,
    user.id,
    id,
    status
  );
  if (!item) {
    return { success: false as const, error: "Status konnte nicht geändert werden." };
  }

  revalidateStaffMessages();
  return { success: true as const, item };
}

export async function getStaffMessageFileAccess(fileId: string) {
  const user = await requireSessionUser();
  if (!user) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "staff-messages"
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const file = await getStaffMessageFileById(user.tenantId, user.id, fileId);
  if (!file) {
    return { success: false as const, error: "Datei nicht gefunden." };
  }

  return { success: true as const, file };
}
