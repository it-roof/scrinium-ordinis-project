"use server";

import { revalidatePath } from "next/cache";

import { areaOwnsFunction } from "@/lib/area/functions";
import type { ContentModule } from "@/lib/db/schema";
import { isAppModuleId } from "@/lib/modules";
import { uploadObject } from "@/lib/storage/s3";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  closeStaffMessageRow,
  createStaffMessageRow,
  deleteStaffMessageRow,
  discardStaffMessageObjects,
  getStaffMessageFileById,
  handoffStaffMessageRow,
  listStaffColleagues,
  markStaffMessageReadRow,
  staffMessageObjectKey,
} from "./storage";
import {
  isStaffMessageIntent,
  MAX_FILES_PER_STAFF_MESSAGE,
  resolveStaffMessageDueDate,
  resolveStaffMessageIntent,
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

function parseCreateForm(formData: FormData):
  | { error: string }
  | { input: StaffMessageInput } {
  const ballHolderId = String(formData.get("ballHolderId") ?? "").trim();
  const topicKeyRaw = String(formData.get("topicKey") ?? "").trim();
  const topicRaw = String(formData.get("topic") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const intentRaw = String(formData.get("intent") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const moduleRaw = String(formData.get("module") ?? "").trim();
  const matterIdRaw = String(formData.get("matterId") ?? "").trim();

  if (!ballHolderId || !isUuid(ballHolderId)) {
    return { error: "Bitte einen Mitarbeiter wählen." };
  }

  const topic = resolveStaffMessageTopic(topicKeyRaw, topicRaw);
  if ("error" in topic) {
    return { error: topic.error };
  }

  const priority = resolveStaffMessagePriority(priorityRaw);
  if (!priority) {
    return { error: "Ungültige Priorität." };
  }

  const intent = resolveStaffMessageIntent(intentRaw);
  if (!intent) {
    return { error: "Ungültiges Vorgehen." };
  }

  if (dueDateRaw && !resolveStaffMessageDueDate(dueDateRaw)) {
    return { error: "Bitte ein gültiges Datum wählen." };
  }

  if (!isAppModuleId(moduleRaw)) {
    return { error: "Ungültiger Bereich." };
  }

  if (!areaOwnsFunction(moduleRaw, "staff-messages")) {
    return { error: "Aufträge sind in diesem Bereich nicht verfügbar." };
  }

  if (matterIdRaw && !isUuid(matterIdRaw)) {
    return { error: "Ungültige Akte." };
  }

  return {
    input: {
      ballHolderId,
      topicKey: topic.topicKey,
      topic: topic.topic,
      priority,
      dueDate: resolveStaffMessageDueDate(dueDateRaw),
      intent,
      body,
      module: moduleRaw as ContentModule,
      matterId: matterIdRaw || null,
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

/** Anlegen */
export async function createStaffMessage(formData: FormData) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const parsed = parseCreateForm(formData);
  if ("error" in parsed) {
    return { success: false as const, error: parsed.error };
  }

  const messageId = crypto.randomUUID();
  const rawFiles = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (rawFiles.length > MAX_FILES_PER_STAFF_MESSAGE) {
    return {
      success: false as const,
      error: `Maximal ${MAX_FILES_PER_STAFF_MESSAGE} Dateien.`,
    };
  }

  const uploaded: StaffMessageUploadedFile[] = [];
  const uploadedKeys: string[] = [];

  try {
    for (const file of rawFiles) {
      const metaError = validateStaffMessageFileMeta(file.name, file.size);
      if (metaError) {
        await discardStaffMessageObjects(uploadedKeys);
        return { success: false as const, error: metaError };
      }

      const fileId = crypto.randomUUID();
      const storageKey = staffMessageObjectKey(
        user.tenantId,
        messageId,
        fileId,
        file.name
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadObject(
        storageKey,
        buffer,
        file.type || "application/octet-stream"
      );
      uploadedKeys.push(storageKey);
      uploaded.push({
        id: fileId,
        storageKey,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    }

    const result = await createStaffMessageRow(
      user.tenantId,
      user.id,
      parsed.input,
      uploaded,
      messageId
    );

    if ("error" in result) {
      await discardStaffMessageObjects(uploadedKeys);
      return { success: false as const, error: result.error };
    }

    revalidateStaffMessages();
    return { success: true as const, message: result };
  } catch {
    await discardStaffMessageObjects(uploadedKeys);
    return {
      success: false as const,
      error: "Auftrag konnte nicht gesendet werden.",
    };
  }
}

export async function markStaffMessageRead(messageId: string) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  if (!isUuid(messageId)) {
    return { success: false as const, error: "Ungültige Anfrage." };
  }

  const result = await markStaffMessageReadRow(
    user.tenantId,
    user.id,
    messageId
  );
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }
  revalidateStaffMessages();
  return { success: true as const, message: result };
}

/** Übergeben */
export async function handoffStaffMessage(formData: FormData) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const messageId = String(formData.get("messageId") ?? "").trim();
  const toBallHolderId = String(formData.get("toBallHolderId") ?? "").trim();
  const intentRaw = String(formData.get("intent") ?? "").trim();
  const commentRaw = String(formData.get("comment") ?? "").trim();

  if (!isUuid(messageId) || !isUuid(toBallHolderId)) {
    return { success: false as const, error: "Ungültige Anfrage." };
  }
  if (!isStaffMessageIntent(intentRaw)) {
    return { success: false as const, error: "Bitte ein Vorgehen wählen." };
  }

  const result = await handoffStaffMessageRow(
    user.tenantId,
    user.id,
    messageId,
    {
      toBallHolderId,
      intent: intentRaw,
      comment: commentRaw || null,
    }
  );

  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  revalidateStaffMessages();
  return { success: true as const, message: result };
}

/** Abschließen */
export async function closeStaffMessage(formData: FormData) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }

  const messageId = String(formData.get("messageId") ?? "").trim();
  const commentRaw = String(formData.get("comment") ?? "").trim();

  if (!isUuid(messageId)) {
    return { success: false as const, error: "Ungültige Anfrage." };
  }

  const result = await closeStaffMessageRow(
    user.tenantId,
    user.id,
    messageId,
    commentRaw || null
  );

  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  revalidateStaffMessages();
  return { success: true as const, message: result };
}

export async function deleteStaffMessage(messageId: string) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  if (!isUuid(messageId)) {
    return { success: false as const, error: "Ungültige Anfrage." };
  }

  const result = await deleteStaffMessageRow(user.tenantId, user.id, messageId);
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  await discardStaffMessageObjects(result.storageKeys);
  revalidateStaffMessages();
  return { success: true as const };
}

export async function getStaffMessageFileAccess(fileId: string) {
  const { error, user } = await requireStaffMessagesUser();
  if (error || !user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  if (!isUuid(fileId)) {
    return { success: false as const, error: "Ungültige Anfrage." };
  }

  const file = await getStaffMessageFileById(user.tenantId, user.id, fileId);
  if (!file) {
    return { success: false as const, error: "Datei nicht gefunden." };
  }

  return {
    success: true as const,
    file: {
      id: file.id,
      storageKey: file.storageKey,
      filename: file.filename,
      mimeType: file.mimeType,
    },
  };
}
