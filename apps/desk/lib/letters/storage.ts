import { and, asc, count, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { clients, letters, matters, users } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

import {
  INBOX_ACTION_LABELS,
  isLetterKind,
  isLetterStatus,
  LETTER_KIND_LABELS,
  LETTER_STATUS_LABELS,
  type InboxItem,
  type LetterColleague,
  type LetterInput,
  type LetterRecord,
} from "./types";
import type { AppModuleId } from "@/lib/modules";
import { normalizeOptionalAllowedModules } from "@/lib/modules";

const assigneeUser = alias(users, "assignee_user");
const assignerUser = alias(users, "assigner_user");
const creatorUser = alias(users, "creator_user");

type LetterRow = typeof letters.$inferSelect;

function toLetter(
  row: LetterRow,
  meta?: {
    assigneeName?: string | null;
    matterTitle?: string | null;
    clientName?: string | null;
  }
): LetterRecord {
  const kind = isLetterKind(row.kind) ? row.kind : "schreiben";
  const status = isLetterStatus(row.status) ? row.status : "entwurf";
  return {
    id: row.id,
    title: row.title,
    kind,
    subject: row.subject,
    salutation: row.salutation,
    body: row.body,
    closing: row.closing,
    module: row.module,
    status,
    assignedTo: row.assignedTo,
    assignedToName: meta?.assigneeName ?? null,
    createdBy: row.createdBy,
    matterId: row.matterId,
    matterTitle: meta?.matterTitle ?? null,
    clientName: meta?.clientName ?? null,
    recipientEmail: row.recipientEmail ?? "",
    ccEmail: row.ccEmail ?? "",
    assignmentNote: row.assignmentNote ?? "",
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getLetters(
  tenantId: string,
  module?: LetterRecord["module"],
  matterId?: string
): Promise<LetterRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [eq(letters.tenantId, tenantId)];
    if (module) {
      conditions.push(eq(letters.module, module));
    }
    if (matterId) {
      conditions.push(eq(letters.matterId, matterId));
    }

    const rows = await tx
      .select({
        letter: letters,
        assigneeName: users.name,
        matterTitle: matters.title,
        clientName: clients.name,
      })
      .from(letters)
      .leftJoin(users, eq(letters.assignedTo, users.id))
      .leftJoin(matters, eq(letters.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(letters.updatedAt));

    return rows.map((row) =>
      toLetter(row.letter, {
        assigneeName: row.assigneeName,
        matterTitle: row.matterTitle,
        clientName: row.clientName,
      })
    );
  });
}

export async function countInboxItems(
  tenantId: string,
  userId: string,
  module?: AppModuleId
): Promise<number> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [
      eq(letters.tenantId, tenantId),
      eq(letters.assignedTo, userId),
      ne(letters.status, "versendet"),
    ];
    if (module) {
      conditions.push(eq(letters.module, module));
    }
    const [row] = await tx
      .select({ value: count() })
      .from(letters)
      .where(and(...conditions));
    return row?.value ?? 0;
  });
}

export async function getInboxItems(
  tenantId: string,
  userId: string,
  module?: AppModuleId
): Promise<InboxItem[]> {
  return withTenantDb(tenantId, async (tx) => {
    const conditions = [
      eq(letters.tenantId, tenantId),
      eq(letters.assignedTo, userId),
      ne(letters.status, "versendet"),
    ];
    if (module) {
      conditions.push(eq(letters.module, module));
    }

    const rows = await tx
      .select({
        letter: letters,
        assignerName: assignerUser.name,
        creatorName: creatorUser.name,
        matterTitle: matters.title,
        clientName: clients.name,
      })
      .from(letters)
      .leftJoin(assignerUser, eq(letters.assignedBy, assignerUser.id))
      .leftJoin(creatorUser, eq(letters.createdBy, creatorUser.id))
      .leftJoin(matters, eq(letters.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(letters.updatedAt));

    return rows.map((row) => {
      const rawStatus = isLetterStatus(row.letter.status)
        ? row.letter.status
        : "entwurf";
      const status = rawStatus as Exclude<
        import("@/lib/db/schema").LetterStatus,
        "versendet"
      >;
      const kind = isLetterKind(row.letter.kind) ? row.letter.kind : "schreiben";
      const assignedByName =
        row.assignerName?.trim() ||
        row.creatorName?.trim() ||
        null;
      return {
        id: row.letter.id,
        title: row.letter.title,
        kind,
        kindLabel: LETTER_KIND_LABELS[kind],
        subject: row.letter.subject.trim(),
        status,
        statusLabel: LETTER_STATUS_LABELS[status],
        actionLabel: INBOX_ACTION_LABELS[status],
        assignedByName,
        matterId: row.letter.matterId,
        matterTitle: row.matterTitle,
        clientName: row.clientName,
        assignmentNote: row.letter.assignmentNote ?? "",
        updatedAt: row.letter.updatedAt,
      };
    });
  });
}

export async function getLetterById(
  tenantId: string,
  id: string
): Promise<LetterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        letter: letters,
        assigneeName: users.name,
        matterTitle: matters.title,
        clientName: clients.name,
      })
      .from(letters)
      .leftJoin(users, eq(letters.assignedTo, users.id))
      .leftJoin(matters, eq(letters.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .limit(1);

    return row
      ? toLetter(row.letter, {
          assigneeName: row.assigneeName,
          matterTitle: row.matterTitle,
          clientName: row.clientName,
        })
      : null;
  });
}

export async function createLetterRow(
  tenantId: string,
  userId: string,
  input: LetterInput
): Promise<LetterRecord> {
  return withTenantDb(tenantId, async (tx) => {
    const matterId = input.matterId?.trim() || null;
    if (matterId) {
      const [matter] = await tx
        .select({ id: matters.id })
        .from(matters)
        .where(and(eq(matters.id, matterId), eq(matters.tenantId, tenantId)))
        .limit(1);
      if (!matter) {
        throw new Error("Akte nicht gefunden.");
      }
    }

    const [row] = await tx
      .insert(letters)
      .values({
        tenantId,
        createdBy: userId,
        assignedTo: userId,
        status: "entwurf",
        matterId,
        title: input.title.trim(),
        kind: input.kind,
        subject: input.subject.trim(),
        salutation: input.salutation.trim(),
        body: input.body.trim(),
        closing: input.closing.trim(),
        module: input.module,
        recipientEmail: input.recipientEmail?.trim() ?? "",
        ccEmail: input.ccEmail?.trim() ?? "",
        assignmentNote: input.assignmentNote?.trim() ?? "",
      })
      .returning();

    return toLetter(row);
  });
}

export async function updateLetterRow(
  tenantId: string,
  id: string,
  input: LetterInput
): Promise<LetterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const matterId =
      input.matterId === undefined
        ? undefined
        : input.matterId?.trim() || null;

    if (matterId) {
      const [matter] = await tx
        .select({ id: matters.id })
        .from(matters)
        .where(and(eq(matters.id, matterId), eq(matters.tenantId, tenantId)))
        .limit(1);
      if (!matter) {
        return null;
      }
    }

    const [row] = await tx
      .update(letters)
      .set({
        title: input.title.trim(),
        kind: input.kind,
        subject: input.subject.trim(),
        salutation: input.salutation.trim(),
        body: input.body.trim(),
        closing: input.closing.trim(),
        module: input.module,
        recipientEmail: (input.recipientEmail ?? "").trim(),
        ccEmail: (input.ccEmail ?? "").trim(),
        ...(input.assignmentNote !== undefined
          ? { assignmentNote: input.assignmentNote.trim() }
          : {}),
        ...(matterId !== undefined ? { matterId } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .returning();

    return row ? toLetter(row) : null;
  });
}

/** Kollegen für Schreiben-Zuweisung — nur Nutzer mit Zugriff auf den Bereich. */
export async function listLetterColleagues(
  tenantId: string,
  module: AppModuleId = "legal"
): Promise<LetterColleague[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        allowedModules: users.allowedModules,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(asc(users.name));

    return rows
      .filter((row) => {
        const allowed = normalizeOptionalAllowedModules(row.allowedModules);
        if (allowed === null) {
          return true;
        }
        return allowed.includes(module);
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
      }));
  });
}

export async function assignLetterRow(
  tenantId: string,
  id: string,
  assignedTo: string,
  status: import("@/lib/db/schema").LetterStatus,
  options?: {
    matterId?: string | null;
    assignmentNote?: string;
    assignedBy?: string;
  }
): Promise<LetterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [colleague] = await tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.id, assignedTo), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!colleague) {
      return null;
    }

    const matterId =
      options?.matterId === undefined
        ? undefined
        : options.matterId?.trim() || null;

    if (matterId) {
      const [matter] = await tx
        .select({ id: matters.id })
        .from(matters)
        .where(and(eq(matters.id, matterId), eq(matters.tenantId, tenantId)))
        .limit(1);
      if (!matter) {
        return null;
      }
    }

    const [row] = await tx
      .update(letters)
      .set({
        assignedTo,
        status,
        ...(options?.assignedBy !== undefined
          ? { assignedBy: options.assignedBy }
          : {}),
        ...(matterId !== undefined ? { matterId } : {}),
        ...(options?.assignmentNote !== undefined
          ? { assignmentNote: options.assignmentNote.trim() }
          : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .returning();

    return row ? toLetter(row, { assigneeName: colleague.name }) : null;
  });
}

export async function setLetterStatusRow(
  tenantId: string,
  id: string,
  status: import("@/lib/db/schema").LetterStatus
): Promise<LetterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(letters)
      .set({
        status,
        updatedAt: new Date().toISOString(),
        sentAt: status === "versendet" ? new Date().toISOString() : undefined,
      })
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .returning();

    return row ? toLetter(row) : null;
  });
}

export async function markLetterSentRow(
  tenantId: string,
  id: string,
  recipientEmail: string
): Promise<LetterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(letters)
      .set({
        status: "versendet",
        recipientEmail: recipientEmail.trim(),
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .returning();

    return row ? toLetter(row) : null;
  });
}

export async function updateSentLetterMatterRow(
  tenantId: string,
  id: string,
  matterId: string | null
): Promise<LetterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [existing] = await tx
      .select({ status: letters.status, kind: letters.kind })
      .from(letters)
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .limit(1);

    if (
      !existing ||
      existing.status !== "versendet" ||
      existing.kind !== "email"
    ) {
      return null;
    }

    if (matterId) {
      const [matter] = await tx
        .select({ id: matters.id })
        .from(matters)
        .where(and(eq(matters.id, matterId), eq(matters.tenantId, tenantId)))
        .limit(1);
      if (!matter) {
        return null;
      }
    }

    const [row] = await tx
      .update(letters)
      .set({
        matterId,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .returning();

    if (!row) {
      return null;
    }

    const [meta] = await tx
      .select({
        assigneeName: users.name,
        matterTitle: matters.title,
        clientName: clients.name,
      })
      .from(letters)
      .leftJoin(users, eq(letters.assignedTo, users.id))
      .leftJoin(matters, eq(letters.matterId, matters.id))
      .leftJoin(clients, eq(matters.clientId, clients.id))
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .limit(1);

    return toLetter(row, {
      assigneeName: meta?.assigneeName ?? null,
      matterTitle: meta?.matterTitle ?? null,
      clientName: meta?.clientName ?? null,
    });
  });
}

export async function deleteLetterRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(letters)
      .where(and(eq(letters.id, id), eq(letters.tenantId, tenantId)))
      .returning({ id: letters.id });

    return deleted.length > 0;
  });
}
