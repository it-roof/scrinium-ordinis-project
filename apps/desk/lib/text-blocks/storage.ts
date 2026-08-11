import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { textBlocks } from "@/lib/db/schema";

import type { TextBlock, TextBlockInput } from "./types";

type TextBlockRow = typeof textBlocks.$inferSelect;

function toTextBlock(row: TextBlockRow): TextBlock {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    department: row.department,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getTextBlocks(): Promise<TextBlock[]> {
  const rows = await db
    .select()
    .from(textBlocks)
    .orderBy(desc(textBlocks.updatedAt));

  return rows.map(toTextBlock);
}

export async function createTextBlockRow(
  input: TextBlockInput
): Promise<TextBlock> {
  const [row] = await db
    .insert(textBlocks)
    .values({
      title: input.title.trim(),
      content: input.content.trim(),
      department: input.department,
    })
    .returning();

  return toTextBlock(row);
}

export async function updateTextBlockRow(
  id: string,
  input: TextBlockInput
): Promise<TextBlock | null> {
  const [row] = await db
    .update(textBlocks)
    .set({
      title: input.title.trim(),
      content: input.content.trim(),
      department: input.department,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(textBlocks.id, id))
    .returning();

  return row ? toTextBlock(row) : null;
}

export async function deleteTextBlockRow(id: string): Promise<boolean> {
  const deleted = await db
    .delete(textBlocks)
    .where(eq(textBlocks.id, id))
    .returning({ id: textBlocks.id });

  return deleted.length > 0;
}
