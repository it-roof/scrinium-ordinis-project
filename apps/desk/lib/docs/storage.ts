import { and, asc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import {
  docAssets,
  docPages,
  docTagAssignments,
  docTags,
} from "@/lib/db/schema";
import { normalizeTagList, tagKey } from "@/lib/prompts/tag-utils";
import { deleteObject, uploadObject } from "@/lib/storage/s3";
import { withTenantDb } from "@/lib/tenant/db";

import { pickNextDocTagTone } from "./tag-colors";
import { buildUniqueSlug, slugifyTitle } from "./slug";
import {
  buildMarkdownSnippet,
  buildStoredFilename,
  getUploadKind,
} from "./upload-policy";
import type {
  DocAsset,
  DocPage,
  DocPageInput,
  DocPageTreeNode,
  DocTag,
} from "./types";

type DocPageRow = typeof docPages.$inferSelect;
type DocAssetRow = typeof docAssets.$inferSelect;
type TagRow = typeof docTags.$inferSelect;
type TenantTx = Parameters<Parameters<typeof withTenantDb>[1]>[0];

function toDocTag(row: TagRow): DocTag {
  return { id: row.id, name: row.name, color: row.color };
}

function toDocPage(row: DocPageRow, tags: DocTag[] = []): DocPage {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    module: row.module,
    tags,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDocAsset(row: DocAssetRow): DocAsset {
  return {
    id: row.id,
    storageKey: row.storageKey,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  };
}

async function getTakenSlugs(
  tx: TenantTx,
  tenantId: string,
  excludeId?: string
): Promise<Set<string>> {
  const rows = await tx
    .select({ slug: docPages.slug, id: docPages.id })
    .from(docPages)
    .where(eq(docPages.tenantId, tenantId));

  return new Set(
    rows.filter((row) => row.id !== excludeId).map((row) => row.slug)
  );
}

async function validateParent(
  tx: TenantTx,
  tenantId: string,
  parentId: string | null
): Promise<string | null> {
  if (!parentId) return null;

  const [parent] = await tx
    .select({ id: docPages.id, parentId: docPages.parentId })
    .from(docPages)
    .where(and(eq(docPages.id, parentId), eq(docPages.tenantId, tenantId)))
    .limit(1);

  if (!parent) {
    return "Übergeordnete Seite nicht gefunden.";
  }

  if (parent.parentId) {
    return "Es sind maximal zwei Ebenen erlaubt.";
  }

  return null;
}

async function loadTagsByPageIds(
  tx: TenantTx,
  pageIds: string[]
): Promise<Map<string, DocTag[]>> {
  const tagMap = new Map<string, DocTag[]>();
  if (pageIds.length === 0) return tagMap;

  const rows = await tx
    .select({
      pageId: docTagAssignments.pageId,
      tag: docTags,
    })
    .from(docTagAssignments)
    .innerJoin(docTags, eq(docTagAssignments.tagId, docTags.id))
    .where(inArray(docTagAssignments.pageId, pageIds))
    .orderBy(asc(docTags.name));

  for (const row of rows) {
    const current = tagMap.get(row.pageId) ?? [];
    current.push(toDocTag(row.tag));
    tagMap.set(row.pageId, current);
  }

  return tagMap;
}

async function findTagByName(
  tx: TenantTx,
  tenantId: string,
  name: string
): Promise<TagRow | null> {
  const [row] = await tx
    .select()
    .from(docTags)
    .where(
      and(
        eq(docTags.tenantId, tenantId),
        sql`lower(${docTags.name}) = ${tagKey(name)}`
      )
    )
    .limit(1);

  return row ?? null;
}

async function upsertTags(
  tx: TenantTx,
  tenantId: string,
  tagNames: string[]
): Promise<DocTag[]> {
  const normalizedNames = normalizeTagList(tagNames);
  const tags: DocTag[] = [];

  const existingColors = await tx
    .select({ color: docTags.color })
    .from(docTags)
    .where(eq(docTags.tenantId, tenantId));
  const usedColors = existingColors.map((row) => row.color);

  for (const name of normalizedNames) {
    const existing = await findTagByName(tx, tenantId, name);
    if (existing) {
      tags.push(toDocTag(existing));
      continue;
    }

    const color = pickNextDocTagTone(usedColors);
    usedColors.push(color);

    const [created] = await tx
      .insert(docTags)
      .values({ tenantId, name, color })
      .onConflictDoNothing({
        target: [docTags.tenantId, docTags.name],
      })
      .returning();

    if (created) {
      tags.push(toDocTag(created));
      continue;
    }

    const fallback = await findTagByName(tx, tenantId, name);
    if (fallback) {
      tags.push(toDocTag(fallback));
    }
  }

  return tags;
}

async function syncDocPageTags(
  tx: TenantTx,
  tenantId: string,
  pageId: string,
  tagNames: string[]
) {
  const tags = await upsertTags(tx, tenantId, tagNames);

  await tx
    .delete(docTagAssignments)
    .where(eq(docTagAssignments.pageId, pageId));

  if (tags.length > 0) {
    await tx.insert(docTagAssignments).values(
      tags.map((tag) => ({
        pageId,
        tagId: tag.id,
      }))
    );
  }

  await tx
    .delete(docTags)
    .where(
      and(
        eq(docTags.tenantId, tenantId),
        sql`not exists (
          select 1
          from ${docTagAssignments}
          where ${docTagAssignments.tagId} = ${docTags.id}
        )`
      )
    );
}

export async function getDocTags(tenantId: string): Promise<DocTag[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(docTags)
      .where(eq(docTags.tenantId, tenantId))
      .orderBy(asc(docTags.name));

    return rows.map(toDocTag);
  });
}

/** @deprecated Prefer getDocTags — nur Namen für Vorschläge. */
export async function getDocTagNames(tenantId: string): Promise<string[]> {
  const tags = await getDocTags(tenantId);
  return tags.map((tag) => tag.name);
}

export async function getDocPages(
  tenantId: string,
  modules?: readonly DocPage["module"][]
): Promise<DocPage[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(docPages)
      .where(
        modules && modules.length > 0
          ? and(
              eq(docPages.tenantId, tenantId),
              inArray(docPages.module, [...modules])
            )
          : eq(docPages.tenantId, tenantId)
      )
      .orderBy(asc(docPages.sortOrder), asc(docPages.title));

    const tagMap = await loadTagsByPageIds(
      tx,
      rows.map((row) => row.id)
    );

    return rows.map((row) => toDocPage(row, tagMap.get(row.id) ?? []));
  });
}

export function buildDocPageTree(pages: DocPage[]): DocPageTreeNode[] {
  const roots = pages
    .filter((page) => !page.parentId)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.title.localeCompare(right.title, "de")
    );

  return roots.map((root) => ({
    ...root,
    children: pages
      .filter((page) => page.parentId === root.id)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.title.localeCompare(right.title, "de")
      ),
  }));
}

export async function getDocPageTree(
  tenantId: string,
  modules?: readonly DocPage["module"][]
): Promise<DocPageTreeNode[]> {
  const pages = await getDocPages(tenantId, modules);
  return buildDocPageTree(pages);
}

export async function getDocPageBySlug(
  tenantId: string,
  slug: string
): Promise<DocPage | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(docPages)
      .where(and(eq(docPages.slug, slug), eq(docPages.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;
    const tagMap = await loadTagsByPageIds(tx, [row.id]);
    return toDocPage(row, tagMap.get(row.id) ?? []);
  });
}

export async function getDocPageById(
  tenantId: string,
  id: string
): Promise<DocPage | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(docPages)
      .where(and(eq(docPages.id, id), eq(docPages.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;
    const tagMap = await loadTagsByPageIds(tx, [row.id]);
    return toDocPage(row, tagMap.get(row.id) ?? []);
  });
}

export async function searchDocPages(
  tenantId: string,
  query: string
): Promise<DocPage[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return getDocPages(tenantId);
  }

  return withTenantDb(tenantId, async (tx) => {
    const pattern = `%${trimmed}%`;
    const rows = await tx
      .select()
      .from(docPages)
      .where(
        and(
          eq(docPages.tenantId, tenantId),
          or(ilike(docPages.title, pattern), ilike(docPages.content, pattern))
        )
      )
      .orderBy(asc(docPages.title));

    const tagMap = await loadTagsByPageIds(
      tx,
      rows.map((row) => row.id)
    );

    return rows.map((row) => toDocPage(row, tagMap.get(row.id) ?? []));
  });
}

export async function createDocPageRow(
  tenantId: string,
  input: DocPageInput,
  userId: string
): Promise<{ page?: DocPage; error?: string }> {
  return withTenantDb(tenantId, async (tx) => {
    const parentError = await validateParent(tx, tenantId, input.parentId);

    if (parentError) {
      return { error: parentError };
    }

    const taken = await getTakenSlugs(tx, tenantId);
    const slug = input.slug
      ? buildUniqueSlug(input.slug, taken)
      : buildUniqueSlug(slugifyTitle(input.title), taken);

    const [row] = await tx
      .insert(docPages)
      .values({
        tenantId,
        title: input.title.trim(),
        slug,
        content: input.content,
        parentId: input.parentId,
        sortOrder: input.sortOrder ?? 0,
        module: input.module,
        updatedBy: userId,
      })
      .returning();

    await syncDocPageTags(tx, tenantId, row.id, input.tags);
    const tagMap = await loadTagsByPageIds(tx, [row.id]);
    return { page: toDocPage(row, tagMap.get(row.id) ?? []) };
  });
}

export async function updateDocPageRow(
  tenantId: string,
  id: string,
  input: DocPageInput,
  userId: string
): Promise<{ page?: DocPage; error?: string }> {
  return withTenantDb(tenantId, async (tx) => {
    const [existingRow] = await tx
      .select()
      .from(docPages)
      .where(and(eq(docPages.id, id), eq(docPages.tenantId, tenantId)))
      .limit(1);

    if (!existingRow) {
      return { error: "Seite nicht gefunden." };
    }

    const existing = toDocPage(existingRow);
    const parentError = await validateParent(tx, tenantId, input.parentId);

    if (parentError) {
      return { error: parentError };
    }

    if (input.parentId === id) {
      return { error: "Eine Seite kann nicht ihre eigene Unterseite sein." };
    }

    const children = await tx
      .select({ id: docPages.id })
      .from(docPages)
      .where(and(eq(docPages.parentId, id), eq(docPages.tenantId, tenantId)));

    if (children.length > 0 && input.parentId) {
      return { error: "Ordner mit Unterseiten können nicht verschoben werden." };
    }

    const taken = await getTakenSlugs(tx, tenantId, id);
    const slug = input.slug
      ? buildUniqueSlug(input.slug, taken)
      : buildUniqueSlug(slugifyTitle(input.title), taken);

    const [row] = await tx
      .update(docPages)
      .set({
        title: input.title.trim(),
        slug,
        content: input.content,
        parentId: input.parentId,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        module: input.module,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(docPages.id, id), eq(docPages.tenantId, tenantId)))
      .returning();

    await syncDocPageTags(tx, tenantId, row.id, input.tags);
    const tagMap = await loadTagsByPageIds(tx, [row.id]);
    return { page: toDocPage(row, tagMap.get(row.id) ?? []) };
  });
}

export async function deleteDocPageRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(docPages)
      .where(and(eq(docPages.id, id), eq(docPages.tenantId, tenantId)))
      .returning({ id: docPages.id });

    return deleted.length > 0;
  });
}

export async function getRootDocPages(tenantId: string): Promise<DocPage[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(docPages)
      .where(and(isNull(docPages.parentId), eq(docPages.tenantId, tenantId)))
      .orderBy(asc(docPages.sortOrder), asc(docPages.title));

    const tagMap = await loadTagsByPageIds(
      tx,
      rows.map((row) => row.id)
    );

    return rows.map((row) => toDocPage(row, tagMap.get(row.id) ?? []));
  });
}

export async function getDocAssetById(
  tenantId: string,
  id: string
): Promise<DocAsset | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(docAssets)
      .where(and(eq(docAssets.id, id), eq(docAssets.tenantId, tenantId)))
      .limit(1);

    return row ? toDocAsset(row) : null;
  });
}

/** Module der Seiten, die diese Datei im Inhalt referenzieren. */
export async function getDocModulesReferencingAsset(
  tenantId: string,
  assetId: string
): Promise<DocPage["module"][]> {
  return withTenantDb(tenantId, async (tx) => {
    const needle = `/api/docs/files/${assetId}`;
    const rows = await tx
      .select({ module: docPages.module })
      .from(docPages)
      .where(
        and(
          eq(docPages.tenantId, tenantId),
          ilike(docPages.content, `%${needle}%`)
        )
      );

    return [...new Set(rows.map((row) => row.module))];
  });
}

export async function getDocAssetsByIds(
  tenantId: string,
  ids: string[]
): Promise<DocAsset[]> {
  if (ids.length === 0) return [];

  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(docAssets)
      .where(and(inArray(docAssets.id, ids), eq(docAssets.tenantId, tenantId)))
      .orderBy(asc(docAssets.createdAt));

    return rows.map(toDocAsset);
  });
}

export async function isAssetReferencedElsewhere(
  tenantId: string,
  assetId: string,
  excludePageId?: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const needle = `/api/docs/files/${assetId}`;
    const rows = await tx
      .select({ id: docPages.id, content: docPages.content })
      .from(docPages)
      .where(
        and(
          eq(docPages.tenantId, tenantId),
          ilike(docPages.content, `%${needle}%`)
        )
      );

    return rows.some((row) => row.id !== excludePageId);
  });
}

export async function deleteDocAssetRow(
  tenantId: string,
  assetId: string,
  excludePageId?: string
): Promise<{ error?: string }> {
  const asset = await getDocAssetById(tenantId, assetId);

  if (!asset) {
    return { error: "Datei nicht gefunden." };
  }

  const referencedElsewhere = await isAssetReferencedElsewhere(
    tenantId,
    assetId,
    excludePageId
  );

  if (referencedElsewhere) {
    return {
      error:
        "Datei wird noch auf einer anderen Seite verwendet und kann nicht gelöscht werden.",
    };
  }

  try {
    await deleteObject(asset.storageKey);
  } catch {
    return { error: "Datei konnte im Storage nicht gelöscht werden." };
  }

  await withTenantDb(tenantId, async (tx) => {
    await tx
      .delete(docAssets)
      .where(and(eq(docAssets.id, assetId), eq(docAssets.tenantId, tenantId)));
  });

  return {};
}

export async function uploadDocAssetRow(
  tenantId: string,
  file: File,
  userId: string
): Promise<{ asset?: DocAsset; markdown?: string; error?: string }> {
  const kind = getUploadKind(file.type);

  if (!kind) {
    return { error: "Nur Bilder (JPEG, PNG, WebP, GIF) und PDFs sind erlaubt." };
  }

  const assetId = crypto.randomUUID();
  const filename = buildStoredFilename(file.name, assetId, file.type);
  const storageKey = `tenants/${tenantId}/docs/${assetId}/${filename}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  await uploadObject(storageKey, buffer, file.type);

  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .insert(docAssets)
      .values({
        id: assetId,
        tenantId,
        storageKey,
        filename,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: userId,
      })
      .returning();

    return {
      asset: toDocAsset(row),
      markdown: buildMarkdownSnippet(assetId, filename, kind),
    };
  });
}

export async function getChildCount(
  tenantId: string,
  parentId: string
): Promise<number> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({ id: docPages.id })
      .from(docPages)
      .where(
        and(eq(docPages.parentId, parentId), eq(docPages.tenantId, tenantId))
      );

    return rows.length;
  });
}

export async function getPagesByModule(
  tenantId: string,
  module: DocPage["module"]
): Promise<DocPage[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(docPages)
      .where(
        and(eq(docPages.module, module), eq(docPages.tenantId, tenantId))
      )
      .orderBy(asc(docPages.sortOrder), asc(docPages.title));

    const tagMap = await loadTagsByPageIds(
      tx,
      rows.map((row) => row.id)
    );

    return rows.map((row) => toDocPage(row, tagMap.get(row.id) ?? []));
  });
}
