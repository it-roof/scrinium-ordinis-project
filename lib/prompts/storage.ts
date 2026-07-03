import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { prompts } from "@/lib/db/schema";

import type { Prompt, PromptInput } from "./types";

type PromptRow = typeof prompts.$inferSelect;

function toPrompt(row: PromptRow): Prompt {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getPrompts(): Promise<Prompt[]> {
  const rows = await db
    .select()
    .from(prompts)
    .orderBy(desc(prompts.updatedAt));

  return rows.map(toPrompt);
}

export async function createPromptRow(input: PromptInput): Promise<Prompt> {
  const [row] = await db
    .insert(prompts)
    .values({
      title: input.title.trim(),
      content: input.content.trim(),
    })
    .returning();

  return toPrompt(row);
}

export async function updatePromptRow(
  id: string,
  input: PromptInput
): Promise<Prompt | null> {
  const [row] = await db
    .update(prompts)
    .set({
      title: input.title.trim(),
      content: input.content.trim(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(prompts.id, id))
    .returning();

  return row ? toPrompt(row) : null;
}

export async function deletePromptRow(id: string): Promise<boolean> {
  const deleted = await db
    .delete(prompts)
    .where(eq(prompts.id, id))
    .returning({ id: prompts.id });

  return deleted.length > 0;
}
