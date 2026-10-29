import { and, desc, eq, sql } from "drizzle-orm";

import { matterFiles, matters } from "@/lib/db/schema";
import { sanitizeFilename } from "@/lib/docs/upload-policy";
import type { PracticeId } from "@/lib/modules";
import { deleteObject } from "@/lib/storage/s3";
import { withTenantDb } from "@/lib/tenant/db";

import {
  normalizeMatterFilename,
  type MatterFileRecord,
} from "./files-types";

type FileRow = typeof matterFiles.$inferSelect;

function toRecord(row: FileRow): MatterFileRecord {
  return {
    id: row.id,
    matterId: row.matterId,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function matterFileObjectKey(
  tenantId: string,
  matterId: string,
  fileId: string,
  filename: string
): string {
  const safe = sanitizeFilename(filename) || "datei";
  return `tenants/${tenantId}/matters/${matterId}/files/${fileId}/${safe}`;
}

export async function listMatterFiles(
  tenantId: string,
  matterId: string,
  module: PracticeId
): Promise<MatterFileRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(matterFiles)
      .where(
        and(
          eq(matterFiles.tenantId, tenantId),
          eq(matterFiles.matterId, matterId),
          eq(matterFiles.module, module)
        )
      )
      .orderBy(desc(matterFiles.updatedAt));

    return rows.map(toRecord);
  });
}

export async function getMatterFileById(
  tenantId: string,
  fileId: string
): Promise<(MatterFileRecord & { storageKey: string; module: PracticeId }) | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(matterFiles)
      .where(
        and(eq(matterFiles.id, fileId), eq(matterFiles.tenantId, tenantId))
      )
      .limit(1);

    if (!row) return null;
    return {
      ...toRecord(row),
      storageKey: row.storageKey,
      module: row.module as PracticeId,
    };
  });
}

export async function findMatterFileByFilename(params: {
  tenantId: string;
  matterId: string;
  module: PracticeId;
  filename: string;
}): Promise<(MatterFileRecord & { storageKey: string }) | null> {
  const normalized = normalizeMatterFilename(params.filename);
  if (!normalized) return null;

  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(matterFiles)
      .where(
        and(
          eq(matterFiles.tenantId, params.tenantId),
          eq(matterFiles.matterId, params.matterId),
          eq(matterFiles.module, params.module),
          sql`lower(${matterFiles.filename}) = ${normalized}`
        )
      )
      .limit(1);

    if (!row) return null;
    return { ...toRecord(row), storageKey: row.storageKey };
  });
}

export async function replaceMatterFileRow(params: {
  tenantId: string;
  fileId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  filename?: string;
}): Promise<(MatterFileRecord & { previousStorageKey: string }) | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [existing] = await tx
      .select({ storageKey: matterFiles.storageKey })
      .from(matterFiles)
      .where(
        and(
          eq(matterFiles.id, params.fileId),
          eq(matterFiles.tenantId, params.tenantId)
        )
      )
      .limit(1);

    if (!existing) return null;

    const [row] = await tx
      .update(matterFiles)
      .set({
        storageKey: params.storageKey,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        ...(params.filename ? { filename: params.filename.trim() } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(matterFiles.id, params.fileId),
          eq(matterFiles.tenantId, params.tenantId)
        )
      )
      .returning();

    if (!row) return null;
    return {
      ...toRecord(row),
      previousStorageKey: existing.storageKey,
    };
  });
}

export async function createMatterFileRow(params: {
  tenantId: string;
  userId: string;
  matterId: string;
  module: PracticeId;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<MatterFileRecord | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [matter] = await tx
      .select({ id: matters.id, module: matters.module })
      .from(matters)
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId)
        )
      )
      .limit(1);

    if (!matter || matter.module !== params.module) {
      return null;
    }

    const [row] = await tx
      .insert(matterFiles)
      .values({
        tenantId: params.tenantId,
        matterId: params.matterId,
        module: params.module,
        uploadedBy: params.userId,
        storageKey: params.storageKey,
        filename: params.filename.trim(),
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
      })
      .returning();

    return row ? toRecord(row) : null;
  });
}

export async function renameMatterFileRow(params: {
  tenantId: string;
  fileId: string;
  filename: string;
}): Promise<MatterFileRecord | null> {
  const filename = params.filename.trim().slice(0, 200);
  if (!filename) return null;

  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .update(matterFiles)
      .set({
        filename,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(matterFiles.id, params.fileId),
          eq(matterFiles.tenantId, params.tenantId)
        )
      )
      .returning();

    return row ? toRecord(row) : null;
  });
}

export async function deleteMatterFileRow(
  tenantId: string,
  fileId: string
): Promise<{ storageKey: string } | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .delete(matterFiles)
      .where(
        and(eq(matterFiles.id, fileId), eq(matterFiles.tenantId, tenantId))
      )
      .returning({ storageKey: matterFiles.storageKey });

    return row ?? null;
  });
}

export async function discardMatterFileObject(storageKey: string) {
  try {
    await deleteObject(storageKey);
  } catch {
    // best effort
  }
}
