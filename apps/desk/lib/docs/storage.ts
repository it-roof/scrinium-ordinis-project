import { asc, eq, ilike, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { docAssets, docPages } from "@/lib/db/schema";
import { deleteObject, uploadObject } from "@/lib/storage/s3";

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
} from "./types";

type DocPageRow = typeof docPages.$inferSelect;
type DocAssetRow = typeof docAssets.$inferSelect;

function toDocPage(row: DocPageRow): DocPage {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    department: row.department,
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

async function getTakenSlugs(excludeId?: string): Promise<Set<string>> {
  const rows = await db.select({ slug: docPages.slug, id: docPages.id }).from(docPages);

  return new Set(
    rows.filter((row) => row.id !== excludeId).map((row) => row.slug)
  );
}

async function validateParent(parentId: string | null): Promise<string | null> {
  if (!parentId) return null;

  const [parent] = await db
    .select({ id: docPages.id, parentId: docPages.parentId })
    .from(docPages)
    .where(eq(docPages.id, parentId))
    .limit(1);

  if (!parent) {
    return "Übergeordnete Seite nicht gefunden.";
  }

  if (parent.parentId) {
    return "Es sind maximal zwei Ebenen erlaubt.";
  }

  return null;
}

export async function getDocPages(): Promise<DocPage[]> {
  const rows = await db
    .select()
    .from(docPages)
    .orderBy(asc(docPages.sortOrder), asc(docPages.title));

  return rows.map(toDocPage);
}

export function buildDocPageTree(pages: DocPage[]): DocPageTreeNode[] {
  const roots = pages
    .filter((page) => !page.parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, "de"));

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

export async function getDocPageTree(): Promise<DocPageTreeNode[]> {
  const pages = await getDocPages();
  return buildDocPageTree(pages);
}

export async function getDocPageBySlug(slug: string): Promise<DocPage | null> {
  const [row] = await db
    .select()
    .from(docPages)
    .where(eq(docPages.slug, slug))
    .limit(1);

  return row ? toDocPage(row) : null;
}

export async function getDocPageById(id: string): Promise<DocPage | null> {
  const [row] = await db
    .select()
    .from(docPages)
    .where(eq(docPages.id, id))
    .limit(1);

  return row ? toDocPage(row) : null;
}

export async function searchDocPages(query: string): Promise<DocPage[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return getDocPages();
  }

  const pattern = `%${trimmed}%`;
  const rows = await db
    .select()
    .from(docPages)
    .where(or(ilike(docPages.title, pattern), ilike(docPages.content, pattern)))
    .orderBy(asc(docPages.title));

  return rows.map(toDocPage);
}

export async function createDocPageRow(
  input: DocPageInput,
  userId: string
): Promise<{ page?: DocPage; error?: string }> {
  const parentError = await validateParent(input.parentId);

  if (parentError) {
    return { error: parentError };
  }

  const taken = await getTakenSlugs();
  const slug = input.slug
    ? buildUniqueSlug(input.slug, taken)
    : buildUniqueSlug(slugifyTitle(input.title), taken);

  const [row] = await db
    .insert(docPages)
    .values({
      title: input.title.trim(),
      slug,
      content: input.content,
      parentId: input.parentId,
      sortOrder: input.sortOrder ?? 0,
      department: input.department,
      updatedBy: userId,
    })
    .returning();

  return { page: toDocPage(row) };
}

export async function updateDocPageRow(
  id: string,
  input: DocPageInput,
  userId: string
): Promise<{ page?: DocPage; error?: string }> {
  const existing = await getDocPageById(id);

  if (!existing) {
    return { error: "Seite nicht gefunden." };
  }

  const parentError = await validateParent(input.parentId);

  if (parentError) {
    return { error: parentError };
  }

  if (input.parentId === id) {
    return { error: "Eine Seite kann nicht ihre eigene Unterseite sein." };
  }

  const children = await db
    .select({ id: docPages.id })
    .from(docPages)
    .where(eq(docPages.parentId, id));

  if (children.length > 0 && input.parentId) {
    return { error: "Ordner mit Unterseiten können nicht verschoben werden." };
  }

  const taken = await getTakenSlugs(id);
  const slug = input.slug
    ? buildUniqueSlug(input.slug, taken)
    : buildUniqueSlug(slugifyTitle(input.title), taken);

  const [row] = await db
    .update(docPages)
    .set({
      title: input.title.trim(),
      slug,
      content: input.content,
      parentId: input.parentId,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      department: input.department,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(docPages.id, id))
    .returning();

  return { page: toDocPage(row) };
}

export async function deleteDocPageRow(id: string): Promise<boolean> {
  const deleted = await db
    .delete(docPages)
    .where(eq(docPages.id, id))
    .returning({ id: docPages.id });

  return deleted.length > 0;
}

export async function getRootDocPages(): Promise<DocPage[]> {
  const rows = await db
    .select()
    .from(docPages)
    .where(isNull(docPages.parentId))
    .orderBy(asc(docPages.sortOrder), asc(docPages.title));

  return rows.map(toDocPage);
}

export async function getDocAssetById(id: string): Promise<DocAsset | null> {
  const [row] = await db
    .select()
    .from(docAssets)
    .where(eq(docAssets.id, id))
    .limit(1);

  return row ? toDocAsset(row) : null;
}

export async function getDocAssetsByIds(ids: string[]): Promise<DocAsset[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .select()
    .from(docAssets)
    .where(inArray(docAssets.id, ids))
    .orderBy(asc(docAssets.createdAt));

  return rows.map(toDocAsset);
}

export async function isAssetReferencedElsewhere(
  assetId: string,
  excludePageId?: string
): Promise<boolean> {
  const needle = `/api/docs/files/${assetId}`;
  const rows = await db
    .select({ id: docPages.id, content: docPages.content })
    .from(docPages)
    .where(ilike(docPages.content, `%${needle}%`));

  return rows.some((row) => row.id !== excludePageId);
}

export async function deleteDocAssetRow(
  assetId: string,
  excludePageId?: string
): Promise<{ error?: string }> {
  const asset = await getDocAssetById(assetId);

  if (!asset) {
    return { error: "Datei nicht gefunden." };
  }

  const referencedElsewhere = await isAssetReferencedElsewhere(
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

  await db.delete(docAssets).where(eq(docAssets.id, assetId));

  return {};
}

export async function uploadDocAssetRow(
  file: File,
  userId: string
): Promise<{ asset?: DocAsset; markdown?: string; error?: string }> {
  const kind = getUploadKind(file.type);

  if (!kind) {
    return { error: "Nur Bilder (JPEG, PNG, WebP, GIF) und PDFs sind erlaubt." };
  }

  const assetId = crypto.randomUUID();
  const filename = buildStoredFilename(file.name, assetId, file.type);
  const storageKey = `docs/${assetId}/${filename}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  await uploadObject(storageKey, buffer, file.type);

  const [row] = await db
    .insert(docAssets)
    .values({
      id: assetId,
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
}

export async function getChildCount(parentId: string): Promise<number> {
  const rows = await db
    .select({ id: docPages.id })
    .from(docPages)
    .where(eq(docPages.parentId, parentId));

  return rows.length;
}

export async function getPagesByDepartment(
  department: DocPage["department"]
): Promise<DocPage[]> {
  const rows = await db
    .select()
    .from(docPages)
    .where(eq(docPages.department, department))
    .orderBy(asc(docPages.sortOrder), asc(docPages.title));

  return rows.map(toDocPage);
}
