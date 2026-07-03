import { asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  promptTagAssignments,
  promptTags,
  prompts,
} from "@/lib/db/schema";

import { normalizeTagList, tagKey } from "./tag-utils";
import type { Prompt, PromptInput, PromptTag } from "./types";

type PromptRow = typeof prompts.$inferSelect;
type TagRow = typeof promptTags.$inferSelect;

function toPromptTag(row: TagRow): PromptTag {
  return {
    id: row.id,
    name: row.name,
  };
}

function toPrompt(row: PromptRow, tags: PromptTag[]): Prompt {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadTagsByPromptIds(
  promptIds: string[]
): Promise<Map<string, PromptTag[]>> {
  const tagMap = new Map<string, PromptTag[]>();

  if (promptIds.length === 0) {
    return tagMap;
  }

  const rows = await db
    .select({
      promptId: promptTagAssignments.promptId,
      tag: promptTags,
    })
    .from(promptTagAssignments)
    .innerJoin(promptTags, eq(promptTagAssignments.tagId, promptTags.id))
    .where(inArray(promptTagAssignments.promptId, promptIds))
    .orderBy(asc(promptTags.name));

  for (const row of rows) {
    const current = tagMap.get(row.promptId) ?? [];
    current.push(toPromptTag(row.tag));
    tagMap.set(row.promptId, current);
  }

  return tagMap;
}

async function findTagByName(name: string): Promise<TagRow | null> {
  const [row] = await db
    .select()
    .from(promptTags)
    .where(sql`lower(${promptTags.name}) = ${tagKey(name)}`)
    .limit(1);

  return row ?? null;
}

async function upsertTags(tagNames: string[]): Promise<PromptTag[]> {
  const normalizedNames = normalizeTagList(tagNames);
  const tags: PromptTag[] = [];

  for (const name of normalizedNames) {
    const existing = await findTagByName(name);

    if (existing) {
      tags.push(toPromptTag(existing));
      continue;
    }

    const [created] = await db
      .insert(promptTags)
      .values({ name })
      .onConflictDoNothing()
      .returning();

    if (created) {
      tags.push(toPromptTag(created));
      continue;
    }

    const fallback = await findTagByName(name);

    if (fallback) {
      tags.push(toPromptTag(fallback));
    }
  }

  return tags;
}

async function syncPromptTags(promptId: string, tagNames: string[]) {
  const tags = await upsertTags(tagNames);

  await db.transaction(async (tx) => {
    await tx
      .delete(promptTagAssignments)
      .where(eq(promptTagAssignments.promptId, promptId));

    if (tags.length > 0) {
      await tx.insert(promptTagAssignments).values(
        tags.map((tag) => ({
          promptId,
          tagId: tag.id,
        }))
      );
    }

    await tx
      .delete(promptTags)
      .where(
        sql`not exists (
          select 1
          from ${promptTagAssignments}
          where ${promptTagAssignments.tagId} = ${promptTags.id}
        )`
      );
  });
}

export async function getPrompts(): Promise<Prompt[]> {
  const rows = await db
    .select()
    .from(prompts)
    .orderBy(desc(prompts.updatedAt));

  const tagMap = await loadTagsByPromptIds(rows.map((row) => row.id));

  return rows.map((row) => toPrompt(row, tagMap.get(row.id) ?? []));
}

export async function getPromptById(id: string): Promise<Prompt | null> {
  const [row] = await db
    .select()
    .from(prompts)
    .where(eq(prompts.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const tagMap = await loadTagsByPromptIds([row.id]);

  return toPrompt(row, tagMap.get(row.id) ?? []);
}

export async function getAllPromptTagNames(): Promise<string[]> {
  const rows = await db
    .select({ name: promptTags.name })
    .from(promptTags)
    .orderBy(asc(promptTags.name));

  return rows.map((row) => row.name);
}

export async function createPromptRow(input: PromptInput): Promise<Prompt> {
  const [row] = await db
    .insert(prompts)
    .values({
      title: input.title.trim(),
      content: input.content.trim(),
    })
    .returning();

  await syncPromptTags(row.id, input.tags);

  const tagMap = await loadTagsByPromptIds([row.id]);

  return toPrompt(row, tagMap.get(row.id) ?? []);
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

  if (!row) {
    return null;
  }

  await syncPromptTags(id, input.tags);

  const tagMap = await loadTagsByPromptIds([id]);

  return toPrompt(row, tagMap.get(id) ?? []);
}

export async function deletePromptRow(id: string): Promise<boolean> {
  const deleted = await db
    .delete(prompts)
    .where(eq(prompts.id, id))
    .returning({ id: prompts.id });

  if (deleted.length === 0) {
    return false;
  }

  await db
    .delete(promptTags)
    .where(
      sql`not exists (
        select 1
        from ${promptTagAssignments}
        where ${promptTagAssignments.tagId} = ${promptTags.id}
      )`
    );

  return true;
}
