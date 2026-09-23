import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { aiDrafts, type AiDraft, type AiDraftStatus } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type AiDraftRecord = {
  id: string;
  clientId: string;
  matterId: string;
  task: string;
  status: AiDraftStatus;
  content: string;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toRecord(row: AiDraft): AiDraftRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    matterId: row.matterId,
    task: row.task,
    status: row.status,
    content: row.content,
    createdBy: row.createdBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createAiDraft(input: {
  tenantId: string;
  clientId: string;
  matterId: string;
  task: string;
  content: string;
  userId: string;
}): Promise<AiDraftRecord> {
  return withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(aiDrafts)
      .values({
        tenantId: input.tenantId,
        clientId: input.clientId,
        matterId: input.matterId,
        task: input.task,
        status: "draft",
        content: input.content,
        createdBy: input.userId,
      })
      .returning();
    return toRecord(row);
  });
}

export async function updateAiDraftContent(input: {
  tenantId: string;
  draftId: string;
  content: string;
}): Promise<AiDraftRecord | null> {
  return withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .update(aiDrafts)
      .set({
        content: input.content,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(aiDrafts.tenantId, input.tenantId),
          eq(aiDrafts.id, input.draftId),
          eq(aiDrafts.status, "draft")
        )
      )
      .returning();
    return row ? toRecord(row) : null;
  });
}

export async function approveAiDraft(input: {
  tenantId: string;
  draftId: string;
  userId: string;
}): Promise<AiDraftRecord | null> {
  return withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .update(aiDrafts)
      .set({
        status: "approved",
        approvedBy: input.userId,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(aiDrafts.tenantId, input.tenantId),
          eq(aiDrafts.id, input.draftId),
          eq(aiDrafts.status, "draft")
        )
      )
      .returning();
    return row ? toRecord(row) : null;
  });
}

export async function discardAiDraft(input: {
  tenantId: string;
  draftId: string;
}): Promise<AiDraftRecord | null> {
  return withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .update(aiDrafts)
      .set({
        status: "discarded",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(aiDrafts.tenantId, input.tenantId),
          eq(aiDrafts.id, input.draftId),
          eq(aiDrafts.status, "draft")
        )
      )
      .returning();
    return row ? toRecord(row) : null;
  });
}

export async function listAiDraftsForMatter(
  tenantId: string,
  matterId: string
): Promise<AiDraftRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(aiDrafts)
      .where(
        and(eq(aiDrafts.tenantId, tenantId), eq(aiDrafts.matterId, matterId))
      )
      .orderBy(desc(aiDrafts.createdAt));
    return rows.map(toRecord);
  });
}

export async function getAiDraftById(
  tenantId: string,
  draftId: string
): Promise<AiDraftRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(aiDrafts)
      .where(and(eq(aiDrafts.tenantId, tenantId), eq(aiDrafts.id, draftId)))
      .limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  });
}
