import "server-only";

import { and, desc, eq } from "drizzle-orm";

import type { ChatPractice } from "@/lib/chat/practice";
import { letters, matterAiChats, matters } from "@/lib/db/schema";
import type {
  LetterDraftInput,
  LetterRecord,
  MatterLetterListItem,
} from "@/lib/letters/types";
import { withTenantDb } from "@/lib/tenant/db";

type LetterRow = typeof letters.$inferSelect;

function toRecord(row: LetterRow): LetterRecord {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    subject: row.subject,
    salutation: row.salutation,
    body: row.body,
    closing: row.closing,
    matterId: row.matterId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getLetterById(
  tenantId: string,
  letterId: string
): Promise<LetterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(letters)
      .where(and(eq(letters.id, letterId), eq(letters.tenantId, tenantId)))
      .limit(1);
    return row ? toRecord(row) : null;
  });
}

export async function listMatterLetters(
  tenantId: string,
  matterId: string,
  module: ChatPractice
): Promise<MatterLetterListItem[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: letters.id,
        title: letters.title,
        updatedAt: letters.updatedAt,
        chatId: matterAiChats.id,
      })
      .from(letters)
      .leftJoin(
        matterAiChats,
        and(
          eq(matterAiChats.letterId, letters.id),
          eq(matterAiChats.tenantId, letters.tenantId)
        )
      )
      .where(
        and(
          eq(letters.tenantId, tenantId),
          eq(letters.matterId, matterId),
          eq(letters.module, module)
        )
      )
      .orderBy(desc(letters.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updatedAt,
      chatId: row.chatId,
    }));
  });
}

export async function createLetterRow(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  matterId: string | null;
  draft: LetterDraftInput;
}): Promise<LetterRecord | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    if (params.matterId) {
      const [matter] = await tx
        .select({ id: matters.id })
        .from(matters)
        .where(
          and(
            eq(matters.id, params.matterId),
            eq(matters.tenantId, params.tenantId),
            eq(matters.module, params.practice)
          )
        )
        .limit(1);
      if (!matter) return null;
    }

    const [row] = await tx
      .insert(letters)
      .values({
        tenantId: params.tenantId,
        createdBy: params.userId,
        assignedTo: params.userId,
        status: "entwurf",
        matterId: params.matterId,
        title: params.draft.title.trim() || "Schreiben",
        kind: "schreiben",
        subject: params.draft.title.trim(),
        salutation: params.draft.salutation.trim(),
        body: params.draft.body.trim(),
        closing: params.draft.closing.trim(),
        module: params.practice,
      })
      .returning();

    return row ? toRecord(row) : null;
  });
}

export async function updateLetterRow(params: {
  tenantId: string;
  letterId: string;
  practice: ChatPractice;
  draft: LetterDraftInput;
}): Promise<LetterRecord | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .update(letters)
      .set({
        title: params.draft.title.trim() || "Schreiben",
        subject: params.draft.title.trim(),
        salutation: params.draft.salutation.trim(),
        body: params.draft.body.trim(),
        closing: params.draft.closing.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(letters.id, params.letterId),
          eq(letters.tenantId, params.tenantId),
          eq(letters.module, params.practice)
        )
      )
      .returning();

    return row ? toRecord(row) : null;
  });
}
