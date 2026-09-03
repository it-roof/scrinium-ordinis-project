import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  staffMessageFiles,
  staffMessageReplies,
  staffMessages,
  users,
  type StaffMessagePriority,
  type StaffMessageStatus,
} from "@/lib/db/schema";
import type { AppModuleId } from "@/lib/modules";
import { sanitizeFilename } from "@/lib/docs/upload-policy";
import { deleteObject, waitForObjectSize } from "@/lib/storage/s3";
import { withTenantDb } from "@/lib/tenant/db";

/**
 * Persistenz für interne Kanzlei-Aufgaben (UI: Nachrichten).
 * Siehe apps/desk/AGENTS.md — „Interne Nachrichten = Aufgaben“.
 */

import type {
  StaffMessageColleague,
  StaffMessageFile,
  StaffMessageInput,
  StaffMessageRecord,
  StaffMessageReply,
  StaffMessageUploadedFile,
} from "./types";
import { MAX_FILES_PER_STAFF_MESSAGE, STAFF_MESSAGE_INBOX_STATUSES } from "./types";

type MessageRow = typeof staffMessages.$inferSelect;
type MessageFileRow = typeof staffMessageFiles.$inferSelect;
type TenantTx = Parameters<Parameters<typeof withTenantDb>[1]>[0];

const senderUser = alias(users, "staff_message_sender");
const recipientUser = alias(users, "staff_message_recipient");
const replyAuthor = alias(users, "staff_message_reply_author");

function toStaffMessageFile(row: MessageFileRow): StaffMessageFile {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}

function toStaffMessage(
  row: MessageRow,
  meta: {
    senderName: string;
    recipientName: string;
    files: StaffMessageFile[];
    replies: StaffMessageReply[];
  }
): StaffMessageRecord {
  return {
    id: row.id,
    module: row.module,
    senderId: row.senderId,
    senderName: meta.senderName,
    recipientId: row.recipientId,
    recipientName: meta.recipientName,
    topicKey: row.topicKey,
    topic: row.topic,
    priority: row.priority,
    dueDate: row.dueDate ?? null,
    status: row.status,
    body: row.body,
    readAt: row.readAt,
    completedAt: row.completedAt,
    files: meta.files,
    replies: meta.replies,
    createdAt: row.createdAt,
  };
}

async function loadFilesForMessages(
  tx: TenantTx,
  tenantId: string,
  messageIds: string[]
): Promise<Map<string, StaffMessageFile[]>> {
  const map = new Map<string, StaffMessageFile[]>();
  if (messageIds.length === 0) {
    return map;
  }

  const rows = await tx
    .select()
    .from(staffMessageFiles)
    .where(
      and(
        eq(staffMessageFiles.tenantId, tenantId),
        inArray(staffMessageFiles.messageId, messageIds)
      )
    )
    .orderBy(asc(staffMessageFiles.createdAt));

  for (const row of rows) {
    const list = map.get(row.messageId) ?? [];
    list.push(toStaffMessageFile(row));
    map.set(row.messageId, list);
  }

  return map;
}

async function loadRepliesForMessages(
  tx: TenantTx,
  tenantId: string,
  messageIds: string[]
): Promise<Map<string, StaffMessageReply[]>> {
  const map = new Map<string, StaffMessageReply[]>();
  if (messageIds.length === 0) {
    return map;
  }

  const rows = await tx
    .select({
      id: staffMessageReplies.id,
      messageId: staffMessageReplies.messageId,
      authorId: staffMessageReplies.authorId,
      authorName: replyAuthor.name,
      body: staffMessageReplies.body,
      createdAt: staffMessageReplies.createdAt,
    })
    .from(staffMessageReplies)
    .innerJoin(replyAuthor, eq(staffMessageReplies.authorId, replyAuthor.id))
    .where(
      and(
        eq(staffMessageReplies.tenantId, tenantId),
        inArray(staffMessageReplies.messageId, messageIds)
      )
    )
    .orderBy(asc(staffMessageReplies.createdAt));

  for (const row of rows) {
    const list = map.get(row.messageId) ?? [];
    list.push({
      id: row.id,
      authorId: row.authorId,
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt,
    });
    map.set(row.messageId, list);
  }

  return map;
}

async function hydrateMessages(
  tx: TenantTx,
  tenantId: string,
  rows: Array<{
    message: MessageRow;
    senderName: string;
    recipientName: string;
  }>
): Promise<StaffMessageRecord[]> {
  const ids = rows.map((row) => row.message.id);
  const [filesByMessage, repliesByMessage] = await Promise.all([
    loadFilesForMessages(tx, tenantId, ids),
    loadRepliesForMessages(tx, tenantId, ids),
  ]);

  return rows.map((row) =>
    toStaffMessage(row.message, {
      senderName: row.senderName,
      recipientName: row.recipientName,
      files: filesByMessage.get(row.message.id) ?? [],
      replies: repliesByMessage.get(row.message.id) ?? [],
    })
  );
}

function participantFilter(userId: string) {
  return or(
    eq(staffMessages.recipientId, userId),
    eq(staffMessages.senderId, userId)
  );
}

export async function listStaffColleagues(
  tenantId: string,
  excludeUserId: string
): Promise<StaffMessageColleague[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          ne(users.id, excludeUserId),
          isNull(users.disabledAt)
        )
      )
      .orderBy(asc(users.lastName), asc(users.firstName));

    return rows;
  });
}

export async function listStaffMessages(
  tenantId: string,
  userId: string,
  module?: AppModuleId
): Promise<StaffMessageRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [
      eq(staffMessages.tenantId, tenantId),
      participantFilter(userId),
    ];
    if (module) {
      conditions.push(eq(staffMessages.module, module));
    }

    const rows = await tx
      .select({
        message: staffMessages,
        senderName: senderUser.name,
        recipientName: recipientUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .innerJoin(recipientUser, eq(staffMessages.recipientId, recipientUser.id))
      .where(and(...conditions))
      .orderBy(desc(staffMessages.createdAt));

    return hydrateMessages(tx, tenantId, rows);
  });
}

/** Offene Nachrichten/Aufgaben an den Empfänger (für Eingang). */
export async function listOpenStaffMessagesForRecipient(
  tenantId: string,
  recipientId: string,
  module?: AppModuleId
): Promise<StaffMessageRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.recipientId, recipientId),
      inArray(staffMessages.status, STAFF_MESSAGE_INBOX_STATUSES),
    ];
    if (module) {
      conditions.push(eq(staffMessages.module, module));
    }

    const rows = await tx
      .select({
        message: staffMessages,
        senderName: senderUser.name,
        recipientName: recipientUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .innerJoin(recipientUser, eq(staffMessages.recipientId, recipientUser.id))
      .where(and(...conditions))
      .orderBy(desc(staffMessages.createdAt));

    return hydrateMessages(tx, tenantId, rows);
  });
}

/**
 * Vom Absender delegierte Aufgaben — alle Statuse
 * (offen, in Bearbeitung, erledigt, zurückgestellt).
 */
export async function listStaffMessagesForSender(
  tenantId: string,
  senderId: string,
  module?: AppModuleId
): Promise<StaffMessageRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.senderId, senderId),
    ];
    if (module) {
      conditions.push(eq(staffMessages.module, module));
    }

    const rows = await tx
      .select({
        message: staffMessages,
        senderName: senderUser.name,
        recipientName: recipientUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .innerJoin(recipientUser, eq(staffMessages.recipientId, recipientUser.id))
      .where(and(...conditions))
      .orderBy(desc(staffMessages.createdAt));

    return hydrateMessages(tx, tenantId, rows);
  });
}

export async function countOpenStaffMessagesForRecipient(
  tenantId: string,
  recipientId: string,
  module?: AppModuleId
): Promise<number> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.recipientId, recipientId),
      inArray(staffMessages.status, STAFF_MESSAGE_INBOX_STATUSES),
    ];
    if (module) {
      conditions.push(eq(staffMessages.module, module));
    }

    const [row] = await tx
      .select({ value: count() })
      .from(staffMessages)
      .where(and(...conditions));

    return row?.value ?? 0;
  });
}

/** Leichter Pulse für Client-Polling (Benachrichtigungston bei neuer ungelesener Nachricht). */
export async function getStaffInboxNotifyPulse(
  tenantId: string,
  recipientId: string
): Promise<{
  unreadCount: number;
  latestUnreadId: string | null;
  latestUnreadAt: string | null;
}> {
  return withTenantDb(tenantId, async (tx) => {
    const unreadConditions = and(
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.recipientId, recipientId),
      inArray(staffMessages.status, STAFF_MESSAGE_INBOX_STATUSES),
      isNull(staffMessages.readAt)
    );

    const [countRow] = await tx
      .select({ value: count() })
      .from(staffMessages)
      .where(unreadConditions);

    const [latest] = await tx
      .select({
        id: staffMessages.id,
        createdAt: staffMessages.createdAt,
      })
      .from(staffMessages)
      .where(unreadConditions)
      .orderBy(desc(staffMessages.createdAt))
      .limit(1);

    return {
      unreadCount: countRow?.value ?? 0,
      latestUnreadId: latest?.id ?? null,
      latestUnreadAt: latest?.createdAt ?? null,
    };
  });
}

export type StaffDashboardStats = {
  sofort: number;
  heute: number;
  unread: number;
  completedThisWeek: number;
};

export type StaffDashboardPreviewItem = {
  id: string;
  topic: string;
  priority: StaffMessagePriority;
  dueDate: string | null;
  senderName: string;
  createdAt: string;
};

export type StaffDashboardLists = {
  urgentTasks: StaffDashboardPreviewItem[];
};

/** Montag 00:00 der laufenden Arbeitswoche (lokal). */
function startOfWorkWeekIso(now = new Date()): string {
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = local.getDay(); // 0=So … 1=Mo
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  local.setDate(local.getDate() - daysSinceMonday);
  local.setHours(0, 0, 0, 0);
  return local.toISOString();
}

function toDashboardPreview(row: {
  id: string;
  topic: string;
  priority: StaffMessagePriority;
  dueDate: string | null;
  createdAt: string;
  senderName: string | null;
}): StaffDashboardPreviewItem {
  return {
    id: row.id,
    topic: row.topic,
    priority: row.priority,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    senderName: row.senderName?.trim() || "Unbekannt",
  };
}

/** Kennzahlen für die Rechtsanwalt-Schnellansicht (Empfänger, aktiver Bereich). */
export async function getStaffDashboardStats(
  tenantId: string,
  recipientId: string,
  module: AppModuleId
): Promise<StaffDashboardStats> {
  return withTenantDb(tenantId, async (tx) => {
    const openBase = and(
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.recipientId, recipientId),
      eq(staffMessages.module, module),
      inArray(staffMessages.status, STAFF_MESSAGE_INBOX_STATUSES)
    );

    const weekStart = startOfWorkWeekIso();

    const [sofortRow, heuteRow, unreadRow, completedRow] = await Promise.all([
      tx
        .select({ value: count() })
        .from(staffMessages)
        .where(and(openBase, eq(staffMessages.priority, "sofort"))),
      tx
        .select({ value: count() })
        .from(staffMessages)
        .where(and(openBase, eq(staffMessages.priority, "heute"))),
      tx
        .select({ value: count() })
        .from(staffMessages)
        .where(and(openBase, isNull(staffMessages.readAt))),
      tx
        .select({ value: count() })
        .from(staffMessages)
        .where(
          and(
            eq(staffMessages.tenantId, tenantId),
            eq(staffMessages.recipientId, recipientId),
            eq(staffMessages.module, module),
            eq(staffMessages.status, "erledigt"),
            gte(staffMessages.completedAt, weekStart)
          )
        ),
    ]);

    return {
      sofort: sofortRow[0]?.value ?? 0,
      heute: heuteRow[0]?.value ?? 0,
      unread: unreadRow[0]?.value ?? 0,
      completedThisWeek: completedRow[0]?.value ?? 0,
    };
  });
}

/** Listen für die Rechtsanwalt-Übersicht (je max. 3 Einträge). */
export async function getStaffDashboardLists(
  tenantId: string,
  recipientId: string,
  module: AppModuleId
): Promise<StaffDashboardLists> {
  return withTenantDb(tenantId, async (tx) => {
    const openBase = and(
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.recipientId, recipientId),
      eq(staffMessages.module, module),
      inArray(staffMessages.status, STAFF_MESSAGE_INBOX_STATUSES)
    );

    const urgentRows = await tx
      .select({
        id: staffMessages.id,
        topic: staffMessages.topic,
        priority: staffMessages.priority,
        dueDate: staffMessages.dueDate,
        createdAt: staffMessages.createdAt,
        senderName: senderUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .where(
        and(openBase, inArray(staffMessages.priority, ["sofort", "heute"]))
      )
      .orderBy(desc(staffMessages.createdAt))
      .limit(12);

    // Sofort vor Heute, dann neueste zuerst — max. 3.
    const urgentSorted = [...urgentRows].sort((a, b) => {
      const rank = (p: StaffMessagePriority) =>
        p === "sofort" ? 0 : p === "heute" ? 1 : 2;
      const byPriority = rank(a.priority) - rank(b.priority);
      if (byPriority !== 0) {
        return byPriority;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return {
      urgentTasks: urgentSorted.slice(0, 3).map(toDashboardPreview),
    };
  });
}

export async function getStaffMessageById(
  tenantId: string,
  userId: string,
  id: string
): Promise<StaffMessageRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        message: staffMessages,
        senderName: senderUser.name,
        recipientName: recipientUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .innerJoin(recipientUser, eq(staffMessages.recipientId, recipientUser.id))
      .where(
        and(
          eq(staffMessages.id, id),
          eq(staffMessages.tenantId, tenantId),
          participantFilter(userId)
        )
      )
      .limit(1);

    const [item] = await hydrateMessages(tx, tenantId, rows);
    return item ?? null;
  });
}

export function staffMessageObjectKey(
  tenantId: string,
  messageId: string,
  fileId: string,
  filename: string
): string {
  const safeName = sanitizeFilename(filename);
  return `tenants/${tenantId}/staff-messages/${messageId}/${fileId}-${safeName}`;
}

export function isOwnedStaffMessageObjectKey(
  tenantId: string,
  messageId: string,
  key: string
): boolean {
  const prefix = `tenants/${tenantId}/staff-messages/${messageId}/`;
  return key.startsWith(prefix) && !key.includes("..") && !key.includes("//");
}

export async function discardStaffMessageObjects(
  tenantId: string,
  messageId: string,
  keys: string[]
): Promise<void> {
  const owned = keys.filter((key) =>
    isOwnedStaffMessageObjectKey(tenantId, messageId, key)
  );
  await Promise.allSettled(owned.map((key) => deleteObject(key)));
}

export async function createStaffMessageRow(
  tenantId: string,
  senderId: string,
  input: StaffMessageInput,
  files: StaffMessageUploadedFile[],
  messageId: string
): Promise<{ message?: StaffMessageRecord; error?: string }> {
  if (files.length > MAX_FILES_PER_STAFF_MESSAGE) {
    return {
      error: `Maximal ${MAX_FILES_PER_STAFF_MESSAGE} Dateien pro Nachricht.`,
    };
  }

  for (const file of files) {
    const expectedKey = staffMessageObjectKey(
      tenantId,
      messageId,
      file.id,
      file.filename
    );
    if (file.storageKey !== expectedKey) {
      return { error: "Ungültiger Dateipfad." };
    }
    const stored = await waitForObjectSize(file.storageKey, file.sizeBytes);
    if (stored === "missing") {
      return { error: "Datei wurde nicht vollständig hochgeladen." };
    }
    if (stored === "mismatch") {
      return { error: "Dateigröße stimmt nicht mit dem Upload überein." };
    }
  }

  try {
    return await withTenantDb(tenantId, async (tx) => {
      const [recipient] = await tx
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(
          and(
            eq(users.id, input.recipientId),
            eq(users.tenantId, tenantId),
            ne(users.id, senderId),
            isNull(users.disabledAt)
          )
        )
        .limit(1);

      if (!recipient) {
        return { error: "Empfänger nicht gefunden." };
      }

      const [sender] = await tx
        .select({ name: users.name })
        .from(users)
        .where(and(eq(users.id, senderId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!sender) {
        return { error: "Absender nicht gefunden." };
      }

      const [row] = await tx
        .insert(staffMessages)
        .values({
          id: messageId,
          tenantId,
          module: input.module,
          senderId,
          recipientId: input.recipientId,
          topicKey: input.topicKey,
          topic: input.topic.trim(),
          priority: input.priority,
          dueDate: input.dueDate,
          status: "offen",
          body: input.body.trim(),
        })
        .returning();

      const fileRows: MessageFileRow[] = [];

      for (const file of files) {
        const [fileRow] = await tx
          .insert(staffMessageFiles)
          .values({
            id: file.id,
            tenantId,
            messageId: row.id,
            storageKey: file.storageKey,
            filename: file.filename.trim(),
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            uploadedBy: senderId,
          })
          .returning();

        fileRows.push(fileRow);
      }

      return {
        message: toStaffMessage(row, {
          senderName: sender.name,
          recipientName: recipient.name,
          files: fileRows.map(toStaffMessageFile),
          replies: [],
        }),
      };
    });
  } catch (error) {
    await discardStaffMessageObjects(
      tenantId,
      messageId,
      files.map((file) => file.storageKey)
    );
    throw error;
  }
}

export async function markStaffMessageReadRow(
  tenantId: string,
  userId: string,
  id: string
): Promise<StaffMessageRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: staffMessages.id })
      .from(staffMessages)
      .where(
        and(
          eq(staffMessages.id, id),
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.recipientId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return null;
    }

    await tx
      .update(staffMessages)
      .set({ readAt: new Date().toISOString() })
      .where(
        and(
          eq(staffMessages.id, id),
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.recipientId, userId)
        )
      );

    const rows = await tx
      .select({
        message: staffMessages,
        senderName: senderUser.name,
        recipientName: recipientUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .innerJoin(recipientUser, eq(staffMessages.recipientId, recipientUser.id))
      .where(
        and(eq(staffMessages.id, id), eq(staffMessages.tenantId, tenantId))
      )
      .limit(1);

    const [item] = await hydrateMessages(tx, tenantId, rows);
    return item ?? null;
  });
}

export async function setStaffMessageStatusRow(
  tenantId: string,
  userId: string,
  id: string,
  status: StaffMessageStatus
): Promise<StaffMessageRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [existing] = await tx
      .select({
        id: staffMessages.id,
        senderId: staffMessages.senderId,
        recipientId: staffMessages.recipientId,
      })
      .from(staffMessages)
      .where(
        and(
          eq(staffMessages.id, id),
          eq(staffMessages.tenantId, tenantId),
          participantFilter(userId)
        )
      )
      .limit(1);

    if (!existing) {
      return null;
    }

    await tx
      .update(staffMessages)
      .set({
        status,
        completedAt: status === "erledigt" ? new Date().toISOString() : null,
      })
      .where(
        and(eq(staffMessages.id, id), eq(staffMessages.tenantId, tenantId))
      );

    const rows = await tx
      .select({
        message: staffMessages,
        senderName: senderUser.name,
        recipientName: recipientUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .innerJoin(recipientUser, eq(staffMessages.recipientId, recipientUser.id))
      .where(
        and(eq(staffMessages.id, id), eq(staffMessages.tenantId, tenantId))
      )
      .limit(1);

    const [item] = await hydrateMessages(tx, tenantId, rows);
    return item ?? null;
  });
}

export async function addStaffMessageReplyRow(
  tenantId: string,
  userId: string,
  messageId: string,
  body: string
): Promise<StaffMessageRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: staffMessages.id })
      .from(staffMessages)
      .where(
        and(
          eq(staffMessages.id, messageId),
          eq(staffMessages.tenantId, tenantId),
          participantFilter(userId)
        )
      )
      .limit(1);

    if (!existing) {
      return null;
    }

    await tx.insert(staffMessageReplies).values({
      tenantId,
      messageId,
      authorId: userId,
      body: body.trim(),
    });

    const rows = await tx
      .select({
        message: staffMessages,
        senderName: senderUser.name,
        recipientName: recipientUser.name,
      })
      .from(staffMessages)
      .innerJoin(senderUser, eq(staffMessages.senderId, senderUser.id))
      .innerJoin(recipientUser, eq(staffMessages.recipientId, recipientUser.id))
      .where(
        and(eq(staffMessages.id, messageId), eq(staffMessages.tenantId, tenantId))
      )
      .limit(1);

    const [item] = await hydrateMessages(tx, tenantId, rows);
    return item ?? null;
  });
}

export async function getStaffMessageFileById(
  tenantId: string,
  userId: string,
  fileId: string
): Promise<
  | {
      storageKey: string;
      filename: string;
    }
  | null
> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        storageKey: staffMessageFiles.storageKey,
        filename: staffMessageFiles.filename,
        recipientId: staffMessages.recipientId,
        senderId: staffMessages.senderId,
      })
      .from(staffMessageFiles)
      .innerJoin(
        staffMessages,
        eq(staffMessageFiles.messageId, staffMessages.id)
      )
      .where(
        and(
          eq(staffMessageFiles.id, fileId),
          eq(staffMessageFiles.tenantId, tenantId),
          eq(staffMessages.tenantId, tenantId),
          participantFilter(userId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      storageKey: row.storageKey,
      filename: row.filename,
    };
  });
}
