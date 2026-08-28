import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import {
  textBlockTagAssignments,
  textBlockTags,
  textBlocks,
} from "@/lib/db/schema";
import { normalizeTagList, tagKey } from "@/lib/prompts/tag-utils";
import { withTenantDb } from "@/lib/tenant/db";

import type { TextBlock, TextBlockInput, TextBlockTag } from "./types";

type TextBlockRow = typeof textBlocks.$inferSelect;
type TagRow = typeof textBlockTags.$inferSelect;

function toTextBlockTag(row: TagRow): TextBlockTag {
  return {
    id: row.id,
    name: row.name,
  };
}

function toTextBlock(row: TextBlockRow, tags: TextBlockTag[]): TextBlock {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    module: row.module,
    tags,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadTagsByTextBlockIds(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  textBlockIds: string[]
): Promise<Map<string, TextBlockTag[]>> {
  const tagMap = new Map<string, TextBlockTag[]>();

  if (textBlockIds.length === 0) {
    return tagMap;
  }

  const rows = await tx
    .select({
      textBlockId: textBlockTagAssignments.textBlockId,
      tag: textBlockTags,
    })
    .from(textBlockTagAssignments)
    .innerJoin(
      textBlockTags,
      eq(textBlockTagAssignments.tagId, textBlockTags.id)
    )
    .where(inArray(textBlockTagAssignments.textBlockId, textBlockIds))
    .orderBy(asc(textBlockTags.name));

  for (const row of rows) {
    const current = tagMap.get(row.textBlockId) ?? [];
    current.push(toTextBlockTag(row.tag));
    tagMap.set(row.textBlockId, current);
  }

  return tagMap;
}

async function findTagByName(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string,
  name: string
): Promise<TagRow | null> {
  const [row] = await tx
    .select()
    .from(textBlockTags)
    .where(
      and(
        eq(textBlockTags.tenantId, tenantId),
        sql`lower(${textBlockTags.name}) = ${tagKey(name)}`
      )
    )
    .limit(1);

  return row ?? null;
}

async function upsertTags(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string,
  tagNames: string[]
): Promise<TextBlockTag[]> {
  const normalizedNames = normalizeTagList(tagNames);
  const tags: TextBlockTag[] = [];

  for (const name of normalizedNames) {
    const existing = await findTagByName(tx, tenantId, name);

    if (existing) {
      tags.push(toTextBlockTag(existing));
      continue;
    }

    const [created] = await tx
      .insert(textBlockTags)
      .values({ tenantId, name })
      .onConflictDoNothing({
        target: [textBlockTags.tenantId, textBlockTags.name],
      })
      .returning();

    if (created) {
      tags.push(toTextBlockTag(created));
      continue;
    }

    const fallback = await findTagByName(tx, tenantId, name);

    if (fallback) {
      tags.push(toTextBlockTag(fallback));
    }
  }

  return tags;
}

async function syncTextBlockTags(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string,
  textBlockId: string,
  tagNames: string[]
) {
  const tags = await upsertTags(tx, tenantId, tagNames);

  await tx
    .delete(textBlockTagAssignments)
    .where(eq(textBlockTagAssignments.textBlockId, textBlockId));

  if (tags.length > 0) {
    await tx.insert(textBlockTagAssignments).values(
      tags.map((tag) => ({
        textBlockId,
        tagId: tag.id,
      }))
    );
  }

  await tx
    .delete(textBlockTags)
    .where(
      and(
        eq(textBlockTags.tenantId, tenantId),
        sql`not exists (
          select 1
          from ${textBlockTagAssignments}
          where ${textBlockTagAssignments.tagId} = ${textBlockTags.id}
        )`
      )
    );
}

async function cleanupOrphanTags(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string
) {
  await tx
    .delete(textBlockTags)
    .where(
      and(
        eq(textBlockTags.tenantId, tenantId),
        sql`not exists (
          select 1
          from ${textBlockTagAssignments}
          where ${textBlockTagAssignments.tagId} = ${textBlockTags.id}
        )`
      )
    );
}

export async function getTextBlocks(
  tenantId: string,
  modules?: readonly TextBlock["module"][]
): Promise<TextBlock[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(textBlocks)
      .where(
        modules && modules.length > 0
          ? and(
              eq(textBlocks.tenantId, tenantId),
              inArray(textBlocks.module, [...modules])
            )
          : eq(textBlocks.tenantId, tenantId)
      )
      .orderBy(desc(textBlocks.updatedAt));

    const tagMap = await loadTagsByTextBlockIds(
      tx,
      rows.map((row) => row.id)
    );

    return rows.map((row) => toTextBlock(row, tagMap.get(row.id) ?? []));
  });
}

export async function getTextBlockById(
  tenantId: string,
  id: string
): Promise<TextBlock | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(textBlocks)
      .where(and(eq(textBlocks.id, id), eq(textBlocks.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const tagMap = await loadTagsByTextBlockIds(tx, [row.id]);

    return toTextBlock(row, tagMap.get(row.id) ?? []);
  });
}

export async function getAllTextBlockTagNames(
  tenantId: string
): Promise<string[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({ name: textBlockTags.name })
      .from(textBlockTags)
      .where(eq(textBlockTags.tenantId, tenantId))
      .orderBy(asc(textBlockTags.name));

    return rows.map((row) => row.name);
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

    await syncTextBlockTags(tx, tenantId, row.id, input.tags);

    const tagMap = await loadTagsByTextBlockIds(tx, [row.id]);

    return toTextBlock(row, tagMap.get(row.id) ?? []);
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

    if (!row) {
      return null;
    }

    await syncTextBlockTags(tx, tenantId, id, input.tags);

    const tagMap = await loadTagsByTextBlockIds(tx, [id]);

    return toTextBlock(row, tagMap.get(id) ?? []);
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

    if (deleted.length === 0) {
      return false;
    }

    await cleanupOrphanTags(tx, tenantId);

    return true;
  });
}
