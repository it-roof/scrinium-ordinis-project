import { and, asc, eq, inArray, sql } from "drizzle-orm";

import {
  promptTagAssignments,
  promptTags,
  prompts,
} from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

import { normalizeTagList, normalizeTagName, tagKey } from "./tag-utils";
import type {
  Prompt,
  PromptInput,
  PromptTag,
  PromptTagWithCount,
} from "./types";

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
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  promptIds: string[]
): Promise<Map<string, PromptTag[]>> {
  const tagMap = new Map<string, PromptTag[]>();

  if (promptIds.length === 0) {
    return tagMap;
  }

  const rows = await tx
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

async function findTagByName(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string,
  name: string
): Promise<TagRow | null> {
  const [row] = await tx
    .select()
    .from(promptTags)
    .where(
      and(
        eq(promptTags.tenantId, tenantId),
        sql`lower(${promptTags.name}) = ${tagKey(name)}`
      )
    )
    .limit(1);

  return row ?? null;
}

async function upsertTags(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string,
  tagNames: string[]
): Promise<PromptTag[]> {
  const normalizedNames = normalizeTagList(tagNames);
  const tags: PromptTag[] = [];

  for (const name of normalizedNames) {
    const existing = await findTagByName(tx, tenantId, name);

    if (existing) {
      tags.push(toPromptTag(existing));
      continue;
    }

    const [created] = await tx
      .insert(promptTags)
      .values({ tenantId, name })
      .onConflictDoNothing({
        target: [promptTags.tenantId, promptTags.name],
      })
      .returning();

    if (created) {
      tags.push(toPromptTag(created));
      continue;
    }

    const fallback = await findTagByName(tx, tenantId, name);

    if (fallback) {
      tags.push(toPromptTag(fallback));
    }
  }

  return tags;
}

async function syncPromptTags(
  tx: Parameters<Parameters<typeof withTenantDb>[1]>[0],
  tenantId: string,
  promptId: string,
  tagNames: string[]
) {
  const tags = await upsertTags(tx, tenantId, tagNames);

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
      and(
        eq(promptTags.tenantId, tenantId),
        sql`not exists (
          select 1
          from ${promptTagAssignments}
          where ${promptTagAssignments.tagId} = ${promptTags.id}
        )`
      )
    );
}

export async function getPrompts(tenantId: string): Promise<Prompt[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(prompts)
      .where(eq(prompts.tenantId, tenantId))
      .orderBy(asc(prompts.title));

    const tagMap = await loadTagsByPromptIds(
      tx,
      rows.map((row) => row.id)
    );

    return rows.map((row) => toPrompt(row, tagMap.get(row.id) ?? []));
  });
}

export async function getPromptById(
  tenantId: string,
  id: string
): Promise<Prompt | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(prompts)
      .where(and(eq(prompts.id, id), eq(prompts.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const tagMap = await loadTagsByPromptIds(tx, [row.id]);

    return toPrompt(row, tagMap.get(row.id) ?? []);
  });
}

export async function getAllPromptTagNames(tenantId: string): Promise<string[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({ name: promptTags.name })
      .from(promptTags)
      .where(eq(promptTags.tenantId, tenantId))
      .orderBy(asc(promptTags.name));

    return rows.map((row) => row.name);
  });
}

export async function listPromptTagsWithCounts(
  tenantId: string
): Promise<PromptTagWithCount[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: promptTags.id,
        name: promptTags.name,
        promptCount: sql<number>`count(${promptTagAssignments.promptId})::int`,
      })
      .from(promptTags)
      .leftJoin(
        promptTagAssignments,
        eq(promptTagAssignments.tagId, promptTags.id)
      )
      .where(eq(promptTags.tenantId, tenantId))
      .groupBy(promptTags.id, promptTags.name)
      .orderBy(asc(promptTags.name));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      promptCount: row.promptCount,
    }));
  });
}

export async function createPromptRow(
  tenantId: string,
  input: PromptInput
): Promise<Prompt> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .insert(prompts)
      .values({
        tenantId,
        title: input.title.trim(),
        content: input.content.trim(),
      })
      .returning();

    await syncPromptTags(tx, tenantId, row.id, input.tags);

    const tagMap = await loadTagsByPromptIds(tx, [row.id]);

    return toPrompt(row, tagMap.get(row.id) ?? []);
  });
}

export async function updatePromptRow(
  tenantId: string,
  id: string,
  input: PromptInput
): Promise<Prompt | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(prompts)
      .set({
        title: input.title.trim(),
        content: input.content.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(prompts.id, id), eq(prompts.tenantId, tenantId)))
      .returning();

    if (!row) {
      return null;
    }

    await syncPromptTags(tx, tenantId, id, input.tags);

    const tagMap = await loadTagsByPromptIds(tx, [id]);

    return toPrompt(row, tagMap.get(id) ?? []);
  });
}

export async function renamePromptTagRow(
  tenantId: string,
  tagId: string,
  nextNameRaw: string
): Promise<
  | { ok: true; tag: PromptTag; merged: boolean }
  | { ok: false; error: string }
> {
  const nextName = normalizeTagName(nextNameRaw);
  if (!nextName) {
    return {
      ok: false,
      error: "Bitte einen gültigen Tag-Namen angeben (max. 50 Zeichen).",
    };
  }

  return withTenantDb(tenantId, async (tx) => {
    const [current] = await tx
      .select()
      .from(promptTags)
      .where(and(eq(promptTags.id, tagId), eq(promptTags.tenantId, tenantId)))
      .limit(1);

    if (!current) {
      return { ok: false, error: "Tag nicht gefunden." };
    }

    if (tagKey(current.name) === tagKey(nextName)) {
      if (current.name === nextName) {
        return {
          ok: true,
          tag: toPromptTag(current),
          merged: false,
        };
      }

      const [updated] = await tx
        .update(promptTags)
        .set({ name: nextName })
        .where(
          and(eq(promptTags.id, tagId), eq(promptTags.tenantId, tenantId))
        )
        .returning();

      return {
        ok: true,
        tag: toPromptTag(updated),
        merged: false,
      };
    }

    const conflict = await findTagByName(tx, tenantId, nextName);

    if (conflict && conflict.id !== tagId) {
      const assignments = await tx
        .select({ promptId: promptTagAssignments.promptId })
        .from(promptTagAssignments)
        .where(eq(promptTagAssignments.tagId, tagId));

      for (const assignment of assignments) {
        await tx
          .insert(promptTagAssignments)
          .values({
            promptId: assignment.promptId,
            tagId: conflict.id,
          })
          .onConflictDoNothing();
      }

      await tx
        .delete(promptTagAssignments)
        .where(eq(promptTagAssignments.tagId, tagId));

      await tx
        .delete(promptTags)
        .where(
          and(eq(promptTags.id, tagId), eq(promptTags.tenantId, tenantId))
        );

      return {
        ok: true,
        tag: toPromptTag(conflict),
        merged: true,
      };
    }

    const [updated] = await tx
      .update(promptTags)
      .set({ name: nextName })
      .where(and(eq(promptTags.id, tagId), eq(promptTags.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return { ok: false, error: "Tag nicht gefunden." };
    }

    return {
      ok: true,
      tag: toPromptTag(updated),
      merged: false,
    };
  });
}

export async function deletePromptRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(prompts)
      .where(and(eq(prompts.id, id), eq(prompts.tenantId, tenantId)))
      .returning({ id: prompts.id });

    if (deleted.length === 0) {
      return false;
    }

    await tx
      .delete(promptTags)
      .where(
        and(
          eq(promptTags.tenantId, tenantId),
          sql`not exists (
            select 1
            from ${promptTagAssignments}
            where ${promptTagAssignments.tagId} = ${promptTags.id}
          )`
        )
      );

    return true;
  });
}
