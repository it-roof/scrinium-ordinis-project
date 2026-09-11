import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  clients,
  matters,
  staffMessageEvents,
  staffMessageFiles,
  staffMessages,
  users,
  type StaffMessageIntent,
  type StaffMessagePriority,
} from "@/lib/db/schema";
import type { AppModuleId } from "@/lib/modules";
import { sanitizeFilename } from "@/lib/docs/upload-policy";
import { deleteObject, waitForObjectSize } from "@/lib/storage/s3";
import { withTenantDb } from "@/lib/tenant/db";

import type {
  StaffMessageColleague,
  StaffMessageEvent,
  StaffMessageFile,
  StaffMessageInput,
  StaffMessageRecord,
  StaffMessageUploadedFile,
} from "./types";
import { MAX_FILES_PER_STAFF_MESSAGE } from "./types";

type MessageRow = typeof staffMessages.$inferSelect;
type MessageFileRow = typeof staffMessageFiles.$inferSelect;
type TenantTx = Parameters<Parameters<typeof withTenantDb>[1]>[0];

const createdByUser = alias(users, "staff_message_created_by");
const ballHolderUser = alias(users, "staff_message_ball_holder");
const previousBallUser = alias(users, "staff_message_previous_ball");
const eventActor = alias(users, "staff_message_event_actor");
const eventToBall = alias(users, "staff_message_event_to_ball");

function personName(row: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const full = row.name?.trim();
  if (full) return full;
  return `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Unbekannt";
}

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
    createdByName: string;
    ballHolderName: string;
    previousBallHolderName: string | null;
    matterTitle: string | null;
    matterClientName: string | null;
    files: StaffMessageFile[];
    events: StaffMessageEvent[];
  }
): StaffMessageRecord {
  return {
    id: row.id,
    module: row.module,
    createdById: row.createdById,
    createdByName: meta.createdByName,
    ballHolderId: row.ballHolderId,
    ballHolderName: meta.ballHolderName,
    previousBallHolderId: row.previousBallHolderId,
    previousBallHolderName: meta.previousBallHolderName,
    topicKey: row.topicKey,
    topic: row.topic,
    priority: row.priority,
    dueDate: row.dueDate ?? null,
    intent: row.intent,
    body: row.body,
    matterId: row.matterId,
    matterTitle: meta.matterTitle,
    matterClientName: meta.matterClientName,
    readAt: row.readAt,
    closedAt: row.closedAt,
    files: meta.files,
    events: meta.events,
    createdAt: row.createdAt,
  };
}

async function loadFilesForMessages(
  tx: TenantTx,
  tenantId: string,
  messageIds: string[]
): Promise<Map<string, StaffMessageFile[]>> {
  const map = new Map<string, StaffMessageFile[]>();
  if (messageIds.length === 0) return map;

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

async function loadEventsForMessages(
  tx: TenantTx,
  tenantId: string,
  messageIds: string[]
): Promise<Map<string, StaffMessageEvent[]>> {
  const map = new Map<string, StaffMessageEvent[]>();
  if (messageIds.length === 0) return map;

  const rows = await tx
    .select({
      id: staffMessageEvents.id,
      messageId: staffMessageEvents.messageId,
      kind: staffMessageEvents.kind,
      actorId: staffMessageEvents.actorId,
      actorName: eventActor.name,
      actorFirstName: eventActor.firstName,
      actorLastName: eventActor.lastName,
      fromBallHolderId: staffMessageEvents.fromBallHolderId,
      toBallHolderId: staffMessageEvents.toBallHolderId,
      toBallName: eventToBall.name,
      toBallFirstName: eventToBall.firstName,
      toBallLastName: eventToBall.lastName,
      intent: staffMessageEvents.intent,
      comment: staffMessageEvents.comment,
      createdAt: staffMessageEvents.createdAt,
    })
    .from(staffMessageEvents)
    .innerJoin(eventActor, eq(staffMessageEvents.actorId, eventActor.id))
    .leftJoin(eventToBall, eq(staffMessageEvents.toBallHolderId, eventToBall.id))
    .where(
      and(
        eq(staffMessageEvents.tenantId, tenantId),
        inArray(staffMessageEvents.messageId, messageIds)
      )
    )
    .orderBy(asc(staffMessageEvents.createdAt));

  for (const row of rows) {
    const list = map.get(row.messageId) ?? [];
    list.push({
      id: row.id,
      kind: row.kind,
      actorId: row.actorId,
      actorName: personName({
        name: row.actorName,
        firstName: row.actorFirstName,
        lastName: row.actorLastName,
      }),
      fromBallHolderId: row.fromBallHolderId,
      toBallHolderId: row.toBallHolderId,
      toBallHolderName: row.toBallHolderId
        ? personName({
            name: row.toBallName,
            firstName: row.toBallFirstName,
            lastName: row.toBallLastName,
          })
        : null,
      intent: row.intent,
      comment: row.comment,
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
    createdByName: string | null;
    createdByFirstName: string | null;
    createdByLastName: string | null;
    ballHolderName: string | null;
    ballHolderFirstName: string | null;
    ballHolderLastName: string | null;
    previousBallName: string | null;
    previousBallFirstName: string | null;
    previousBallLastName: string | null;
    matterTitle: string | null;
    matterClientName: string | null;
  }>
): Promise<StaffMessageRecord[]> {
  const ids = rows.map((r) => r.message.id);
  const [filesMap, eventsMap] = await Promise.all([
    loadFilesForMessages(tx, tenantId, ids),
    loadEventsForMessages(tx, tenantId, ids),
  ]);

  return rows.map((row) =>
    toStaffMessage(row.message, {
      createdByName: personName({
        name: row.createdByName,
        firstName: row.createdByFirstName,
        lastName: row.createdByLastName,
      }),
      ballHolderName: personName({
        name: row.ballHolderName,
        firstName: row.ballHolderFirstName,
        lastName: row.ballHolderLastName,
      }),
      previousBallHolderName: row.message.previousBallHolderId
        ? personName({
            name: row.previousBallName,
            firstName: row.previousBallFirstName,
            lastName: row.previousBallLastName,
          })
        : null,
      matterTitle: row.matterTitle,
      matterClientName: row.matterClientName,
      files: filesMap.get(row.message.id) ?? [],
      events: eventsMap.get(row.message.id) ?? [],
    })
  );
}

const selectMessageJoins = {
  message: staffMessages,
  createdByName: createdByUser.name,
  createdByFirstName: createdByUser.firstName,
  createdByLastName: createdByUser.lastName,
  ballHolderName: ballHolderUser.name,
  ballHolderFirstName: ballHolderUser.firstName,
  ballHolderLastName: ballHolderUser.lastName,
  previousBallName: previousBallUser.name,
  previousBallFirstName: previousBallUser.firstName,
  previousBallLastName: previousBallUser.lastName,
  matterTitle: matters.title,
  matterClientName: clients.name,
};

export async function listStaffColleagues(
  tenantId: string,
  userId: string
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
          ne(users.id, userId),
          isNull(users.disabledAt)
        )
      )
      .orderBy(asc(users.lastName), asc(users.firstName));

    return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName ?? "",
      lastName: row.lastName ?? "",
      name: personName(row),
      email: row.email,
    }));
  });
}

/** Alle Aufträge, an denen der User beteiligt ist. */
export async function listStaffMessages(
  tenantId: string,
  userId: string,
  module: AppModuleId
): Promise<StaffMessageRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select(selectMessageJoins)
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .innerJoin(ballHolderUser, eq(staffMessages.ballHolderId, ballHolderUser.id))
      .leftJoin(
        previousBallUser,
        eq(staffMessages.previousBallHolderId, previousBallUser.id)
      )
      .leftJoin(matters, eq(staffMessages.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.module, module),
          or(
            eq(staffMessages.createdById, userId),
            eq(staffMessages.ballHolderId, userId),
            eq(staffMessages.previousBallHolderId, userId)
          )
        )
      )
      .orderBy(desc(staffMessages.createdAt));

    return hydrateMessages(tx, tenantId, rows);
  });
}

/** Eingang: Ball bei mir. */
export async function listBallInbox(
  tenantId: string,
  userId: string,
  module: AppModuleId
): Promise<StaffMessageRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select(selectMessageJoins)
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .innerJoin(ballHolderUser, eq(staffMessages.ballHolderId, ballHolderUser.id))
      .leftJoin(
        previousBallUser,
        eq(staffMessages.previousBallHolderId, previousBallUser.id)
      )
      .leftJoin(matters, eq(staffMessages.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.ballHolderId, userId),
          eq(staffMessages.module, module)
        )
      )
      .orderBy(desc(staffMessages.createdAt));

    return hydrateMessages(tx, tenantId, rows);
  });
}

/** Gesendet: von mir angelegt oder zuletzt von mir übergeben (offen bevorzugt sichtbar). */
export async function listBallSent(
  tenantId: string,
  userId: string,
  module: AppModuleId
): Promise<StaffMessageRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select(selectMessageJoins)
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .innerJoin(ballHolderUser, eq(staffMessages.ballHolderId, ballHolderUser.id))
      .leftJoin(
        previousBallUser,
        eq(staffMessages.previousBallHolderId, previousBallUser.id)
      )
      .leftJoin(matters, eq(staffMessages.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.module, module),
          or(
            eq(staffMessages.createdById, userId),
            eq(staffMessages.previousBallHolderId, userId)
          ),
          ne(staffMessages.ballHolderId, userId)
        )
      )
      .orderBy(desc(staffMessages.createdAt));

    return hydrateMessages(tx, tenantId, rows);
  });
}

/** @deprecated Alias — Eingang. */
export const listOpenStaffMessagesForRecipient = listBallInbox;
/** @deprecated Alias — Gesendet. */
export const listStaffMessagesForSender = listBallSent;

export async function countOpenStaffMessagesForRecipient(
  tenantId: string,
  recipientId: string,
  module?: AppModuleId
): Promise<number> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.ballHolderId, recipientId),
      isNull(staffMessages.closedAt),
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

export async function getStaffInboxNotifyPulse(
  tenantId: string,
  recipientId: string
): Promise<{
  unreadCount: number;
  latestUnreadId: string | null;
  latestUnreadAt: string | null;
}> {
  return withTenantDb(tenantId, async (tx) => {
    const unreadWhere = and(
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.ballHolderId, recipientId),
      isNull(staffMessages.closedAt),
      isNull(staffMessages.readAt)
    );

    const [countRow] = await tx
      .select({ value: count() })
      .from(staffMessages)
      .where(unreadWhere);

    const [latest] = await tx
      .select({
        id: staffMessages.id,
        createdAt: staffMessages.createdAt,
      })
      .from(staffMessages)
      .where(unreadWhere)
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
  body: string;
  priority: StaffMessagePriority;
  dueDate: string | null;
  senderName: string;
  createdAt: string;
};

export type StaffDashboardLists = {
  urgentTasks: StaffDashboardPreviewItem[];
};

function startOfWorkWeekIso(now = new Date()): string {
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = local.getDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  local.setDate(local.getDate() - daysSinceMonday);
  local.setHours(0, 0, 0, 0);
  return local.toISOString();
}

export async function getStaffDashboardStats(
  tenantId: string,
  recipientId: string,
  module: AppModuleId
): Promise<StaffDashboardStats> {
  return withTenantDb(tenantId, async (tx) => {
    const openBase = and(
      eq(staffMessages.tenantId, tenantId),
      eq(staffMessages.ballHolderId, recipientId),
      eq(staffMessages.module, module),
      isNull(staffMessages.closedAt)
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
            eq(staffMessages.ballHolderId, recipientId),
            eq(staffMessages.module, module),
            gte(staffMessages.closedAt, weekStart)
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

export async function getStaffDashboardLists(
  tenantId: string,
  recipientId: string,
  module: AppModuleId
): Promise<StaffDashboardLists> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: staffMessages.id,
        topic: staffMessages.topic,
        body: staffMessages.body,
        priority: staffMessages.priority,
        dueDate: staffMessages.dueDate,
        createdAt: staffMessages.createdAt,
        senderName: createdByUser.name,
        senderFirstName: createdByUser.firstName,
        senderLastName: createdByUser.lastName,
      })
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.ballHolderId, recipientId),
          eq(staffMessages.module, module),
          isNull(staffMessages.closedAt),
          inArray(staffMessages.priority, ["sofort", "heute"])
        )
      )
      .orderBy(desc(staffMessages.createdAt))
      .limit(3);

    return {
      urgentTasks: rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        body: row.body,
        priority: row.priority,
        dueDate: row.dueDate,
        createdAt: row.createdAt,
        senderName: personName({
          name: row.senderName,
          firstName: row.senderFirstName,
          lastName: row.senderLastName,
        }),
      })),
    };
  });
}

export function staffMessageObjectKey(
  tenantId: string,
  messageId: string,
  fileId: string,
  filename: string
): string {
  return `tenants/${tenantId}/staff-messages/${messageId}/${fileId}-${sanitizeFilename(filename)}`;
}

export function isOwnedStaffMessageObjectKey(
  tenantId: string,
  messageId: string,
  storageKey: string
): boolean {
  return storageKey.startsWith(
    `tenants/${tenantId}/staff-messages/${messageId}/`
  );
}

export async function discardStaffMessageObjects(
  storageKeys: string[]
): Promise<void> {
  await Promise.all(
    storageKeys.map(async (key) => {
      try {
        await deleteObject(key);
      } catch {
        // best effort
      }
    })
  );
}

export async function createStaffMessageRow(
  tenantId: string,
  createdById: string,
  input: StaffMessageInput,
  files: StaffMessageUploadedFile[] = [],
  predefinedId?: string
): Promise<StaffMessageRecord | { error: string }> {
  if (files.length > MAX_FILES_PER_STAFF_MESSAGE) {
    return { error: `Maximal ${MAX_FILES_PER_STAFF_MESSAGE} Dateien.` };
  }

  return withTenantDb(tenantId, async (tx) => {
    const [ballHolder] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, input.ballHolderId),
          eq(users.tenantId, tenantId),
          isNull(users.disabledAt)
        )
      )
      .limit(1);

    if (!ballHolder) {
      return { error: "Empfänger ungültig." };
    }

    const messageId = predefinedId ?? crypto.randomUUID();

    let matterId: string | null = null;
    if (input.matterId) {
      const [matter] = await tx
        .select({ id: matters.id })
        .from(matters)
        .where(
          and(
            eq(matters.id, input.matterId),
            eq(matters.tenantId, tenantId),
            eq(matters.module, input.module)
          )
        )
        .limit(1);
      if (!matter) {
        return { error: "Akte ungültig." };
      }
      matterId = matter.id;
    }

    for (const file of files) {
      if (!isOwnedStaffMessageObjectKey(tenantId, messageId, file.storageKey)) {
        return { error: "Ungültige Datei." };
      }
      const sizeOk = await waitForObjectSize(file.storageKey, file.sizeBytes);
      if (sizeOk !== "ok") {
        return { error: "Datei-Upload unvollständig." };
      }
    }

    const [inserted] = await tx
      .insert(staffMessages)
      .values({
        id: messageId,
        tenantId,
        module: input.module,
        createdById,
        ballHolderId: input.ballHolderId,
        previousBallHolderId: createdById,
        topicKey: input.topicKey,
        topic: input.topic,
        priority: input.priority,
        dueDate: input.dueDate,
        intent: input.intent,
        body: input.body,
        matterId,
      })
      .returning();

    if (!inserted) {
      return { error: "Auftrag konnte nicht angelegt werden." };
    }

    if (files.length > 0) {
      await tx.insert(staffMessageFiles).values(
        files.map((file) => ({
          id: file.id,
          tenantId,
          messageId: inserted.id,
          storageKey: file.storageKey,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadedBy: createdById,
        }))
      );
    }

    await tx.insert(staffMessageEvents).values({
      tenantId,
      messageId: inserted.id,
      kind: "angelegt",
      actorId: createdById,
      fromBallHolderId: null,
      toBallHolderId: input.ballHolderId,
      intent: input.intent,
      comment: null,
    });

    const [hydrated] = await tx
      .select(selectMessageJoins)
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .innerJoin(ballHolderUser, eq(staffMessages.ballHolderId, ballHolderUser.id))
      .leftJoin(
        previousBallUser,
        eq(staffMessages.previousBallHolderId, previousBallUser.id)
      )
      .leftJoin(matters, eq(staffMessages.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(eq(staffMessages.id, inserted.id))
      .limit(1);

    if (!hydrated) {
      return { error: "Auftrag angelegt, Laden fehlgeschlagen." };
    }

    const [record] = await hydrateMessages(tx, tenantId, [hydrated]);
    return record;
  });
}

export async function markStaffMessageReadRow(
  tenantId: string,
  userId: string,
  messageId: string
): Promise<StaffMessageRecord | { error: string }> {
  return withTenantDb(tenantId, async (tx) => {
    const [updated] = await tx
      .update(staffMessages)
      .set({ readAt: new Date().toISOString() })
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.id, messageId),
          eq(staffMessages.ballHolderId, userId),
          isNull(staffMessages.readAt)
        )
      )
      .returning({ id: staffMessages.id });

    void updated;

    const [hydrated] = await tx
      .select(selectMessageJoins)
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .innerJoin(ballHolderUser, eq(staffMessages.ballHolderId, ballHolderUser.id))
      .leftJoin(
        previousBallUser,
        eq(staffMessages.previousBallHolderId, previousBallUser.id)
      )
      .leftJoin(matters, eq(staffMessages.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.id, messageId),
          or(
            eq(staffMessages.ballHolderId, userId),
            eq(staffMessages.createdById, userId),
            eq(staffMessages.previousBallHolderId, userId)
          )
        )
      )
      .limit(1);

    if (!hydrated) {
      return { error: "Auftrag nicht gefunden." };
    }
    const [record] = await hydrateMessages(tx, tenantId, [hydrated]);
    return record;
  });
}

export async function handoffStaffMessageRow(
  tenantId: string,
  userId: string,
  messageId: string,
  input: {
    toBallHolderId: string;
    intent: StaffMessageIntent;
    comment: string | null;
  }
): Promise<StaffMessageRecord | { error: string }> {
  return withTenantDb(tenantId, async (tx) => {
    const [current] = await tx
      .select()
      .from(staffMessages)
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.id, messageId),
          eq(staffMessages.ballHolderId, userId),
          isNull(staffMessages.closedAt)
        )
      )
      .limit(1);

    if (!current) {
      return { error: "Nur wer den Ball hat, kann weitergeben." };
    }

    if (input.toBallHolderId === userId) {
      return { error: "Bitte an einen anderen Mitarbeiter weitergeben." };
    }

    const [target] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, input.toBallHolderId),
          eq(users.tenantId, tenantId),
          isNull(users.disabledAt)
        )
      )
      .limit(1);

    if (!target) {
      return { error: "Mitarbeiter ungültig." };
    }

    await tx
      .update(staffMessages)
      .set({
        previousBallHolderId: userId,
        ballHolderId: input.toBallHolderId,
        intent: input.intent,
        readAt: null,
      })
      .where(eq(staffMessages.id, messageId));

    await tx.insert(staffMessageEvents).values({
      tenantId,
      messageId,
      kind: "uebergeben",
      actorId: userId,
      fromBallHolderId: userId,
      toBallHolderId: input.toBallHolderId,
      intent: input.intent,
      comment: input.comment,
    });

    const [hydrated] = await tx
      .select(selectMessageJoins)
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .innerJoin(ballHolderUser, eq(staffMessages.ballHolderId, ballHolderUser.id))
      .leftJoin(
        previousBallUser,
        eq(staffMessages.previousBallHolderId, previousBallUser.id)
      )
      .leftJoin(matters, eq(staffMessages.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(eq(staffMessages.id, messageId))
      .limit(1);

    if (!hydrated) {
      return { error: "Weitergabe gespeichert, Laden fehlgeschlagen." };
    }
    const [record] = await hydrateMessages(tx, tenantId, [hydrated]);
    return record;
  });
}

export async function closeStaffMessageRow(
  tenantId: string,
  userId: string,
  messageId: string,
  comment: string | null
): Promise<StaffMessageRecord | { error: string }> {
  return withTenantDb(tenantId, async (tx) => {
    const [current] = await tx
      .select()
      .from(staffMessages)
      .where(
        and(
          eq(staffMessages.tenantId, tenantId),
          eq(staffMessages.id, messageId),
          eq(staffMessages.ballHolderId, userId),
          isNull(staffMessages.closedAt)
        )
      )
      .limit(1);

    if (!current) {
      return { error: "Nur wer den Ball hat, kann fertig melden." };
    }

    const closedAt = new Date().toISOString();
    await tx
      .update(staffMessages)
      .set({ closedAt, readAt: current.readAt ?? closedAt })
      .where(eq(staffMessages.id, messageId));

    await tx.insert(staffMessageEvents).values({
      tenantId,
      messageId,
      kind: "abgeschlossen",
      actorId: userId,
      fromBallHolderId: userId,
      toBallHolderId: null,
      intent: current.intent,
      comment,
    });

    const [hydrated] = await tx
      .select(selectMessageJoins)
      .from(staffMessages)
      .innerJoin(createdByUser, eq(staffMessages.createdById, createdByUser.id))
      .innerJoin(ballHolderUser, eq(staffMessages.ballHolderId, ballHolderUser.id))
      .leftJoin(
        previousBallUser,
        eq(staffMessages.previousBallHolderId, previousBallUser.id)
      )
      .leftJoin(matters, eq(staffMessages.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(eq(staffMessages.id, messageId))
      .limit(1);

    if (!hydrated) {
      return { error: "Abschluss gespeichert, Laden fehlgeschlagen." };
    }
    const [record] = await hydrateMessages(tx, tenantId, [hydrated]);
    return record;
  });
}

export async function deleteStaffMessageRow(
  tenantId: string,
  userId: string,
  messageId: string
): Promise<{ storageKeys: string[] } | { error: string }> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: staffMessages.id,
        createdById: staffMessages.createdById,
        ballHolderId: staffMessages.ballHolderId,
      })
      .from(staffMessages)
      .where(
        and(eq(staffMessages.tenantId, tenantId), eq(staffMessages.id, messageId))
      )
      .limit(1);

    if (!row) {
      return { error: "Auftrag nicht gefunden." };
    }
    if (row.createdById !== userId && row.ballHolderId !== userId) {
      return { error: "Keine Berechtigung." };
    }

    const files = await tx
      .select({ storageKey: staffMessageFiles.storageKey })
      .from(staffMessageFiles)
      .where(
        and(
          eq(staffMessageFiles.tenantId, tenantId),
          eq(staffMessageFiles.messageId, messageId)
        )
      );

    await tx
      .delete(staffMessages)
      .where(
        and(eq(staffMessages.tenantId, tenantId), eq(staffMessages.id, messageId))
      );

    return { storageKeys: files.map((f) => f.storageKey) };
  });
}

export async function getStaffMessageFileById(
  tenantId: string,
  userId: string,
  fileId: string
): Promise<{
  id: string;
  messageId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
} | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: staffMessageFiles.id,
        messageId: staffMessageFiles.messageId,
        storageKey: staffMessageFiles.storageKey,
        filename: staffMessageFiles.filename,
        mimeType: staffMessageFiles.mimeType,
        createdById: staffMessages.createdById,
        ballHolderId: staffMessages.ballHolderId,
        previousBallHolderId: staffMessages.previousBallHolderId,
      })
      .from(staffMessageFiles)
      .innerJoin(
        staffMessages,
        eq(staffMessageFiles.messageId, staffMessages.id)
      )
      .where(
        and(
          eq(staffMessageFiles.tenantId, tenantId),
          eq(staffMessageFiles.id, fileId)
        )
      )
      .limit(1);

    if (!row) return null;
    if (
      row.createdById !== userId &&
      row.ballHolderId !== userId &&
      row.previousBallHolderId !== userId
    ) {
      return null;
    }

    return {
      id: row.id,
      messageId: row.messageId,
      storageKey: row.storageKey,
      filename: row.filename,
      mimeType: row.mimeType,
    };
  });
}
