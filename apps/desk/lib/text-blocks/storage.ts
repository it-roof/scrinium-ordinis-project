import { and, desc, eq } from "drizzle-orm";

import { textBlocks } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

import type { TextBlock, TextBlockInput } from "./types";

type TextBlockRow = typeof textBlocks.$inferSelect;

function toTextBlock(row: TextBlockRow): TextBlock {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    module: row.module,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getTextBlocks(tenantId: string): Promise<TextBlock[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(textBlocks)
      .where(eq(textBlocks.tenantId, tenantId))
      .orderBy(desc(textBlocks.updatedAt));

    return rows.map(toTextBlock);
  });
}

export async function createTextBlockRow(
  tenantId: string,
  input: TextBlockInput
): Promise<TextBlock> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .insert(textBlocks)
      .values({
        tenantId,
        title: input.title.trim(),
        content: input.content.trim(),
        module: input.module,
      })
      .returning();

    return toTextBlock(row);
  });
}

export async function updateTextBlockRow(
  tenantId: string,
  id: string,
  input: TextBlockInput
): Promise<TextBlock | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(textBlocks)
      .set({
        title: input.title.trim(),
        content: input.content.trim(),
        module: input.module,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(textBlocks.id, id), eq(textBlocks.tenantId, tenantId)))
      .returning();

    return row ? toTextBlock(row) : null;
  });
}

export async function deleteTextBlockRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(textBlocks)
      .where(and(eq(textBlocks.id, id), eq(textBlocks.tenantId, tenantId)))
      .returning({ id: textBlocks.id });

    return deleted.length > 0;
  });
}
