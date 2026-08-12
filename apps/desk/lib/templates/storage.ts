import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { templateFiles, templates } from "@/lib/db/schema";
import { sanitizeFilename } from "@/lib/docs/upload-policy";
import { deleteObject, uploadObject } from "@/lib/storage/s3";
import { withTenantDb } from "@/lib/tenant/db";

import type { Template, TemplateFile, TemplateInput } from "./types";
import { MAX_FILES_PER_TEMPLATE } from "./types";

type TemplateRow = typeof templates.$inferSelect;
type TemplateFileRow = typeof templateFiles.$inferSelect;
type TenantTx = Parameters<Parameters<typeof withTenantDb>[1]>[0];

function toTemplateFile(row: TemplateFileRow): TemplateFile {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

function toTemplate(row: TemplateRow, files: TemplateFile[]): Template {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    module: row.module,
    files,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadFilesForTemplates(
  tx: TenantTx,
  tenantId: string,
  templateIds: string[]
): Promise<Map<string, TemplateFile[]>> {
  const map = new Map<string, TemplateFile[]>();
  if (templateIds.length === 0) return map;

  const rows = await tx
    .select()
    .from(templateFiles)
    .where(
      and(
        eq(templateFiles.tenantId, tenantId),
        inArray(templateFiles.templateId, templateIds)
      )
    )
    .orderBy(asc(templateFiles.sortOrder), asc(templateFiles.createdAt));

  for (const row of rows) {
    const list = map.get(row.templateId) ?? [];
    list.push(toTemplateFile(row));
    map.set(row.templateId, list);
  }

  return map;
}

export async function getTemplates(
  tenantId: string,
  module: Template["module"]
): Promise<Template[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(templates)
      .where(
        and(eq(templates.tenantId, tenantId), eq(templates.module, module))
      )
      .orderBy(desc(templates.updatedAt));

    const filesByTemplate = await loadFilesForTemplates(
      tx,
      tenantId,
      rows.map((row) => row.id)
    );

    return rows.map((row) =>
      toTemplate(row, filesByTemplate.get(row.id) ?? [])
    );
  });
}

export async function getTemplateById(
  tenantId: string,
  id: string
): Promise<Template | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    const filesByTemplate = await loadFilesForTemplates(tx, tenantId, [id]);
    return toTemplate(row, filesByTemplate.get(id) ?? []);
  });
}

export async function createTemplateRow(
  tenantId: string,
  input: TemplateInput,
  userId: string,
  files: File[]
): Promise<{ template?: Template; error?: string }> {
  if (files.length === 0) {
    return { error: "Bitte mindestens eine Datei hinzufügen." };
  }
  if (files.length > MAX_FILES_PER_TEMPLATE) {
    return {
      error: `Maximal ${MAX_FILES_PER_TEMPLATE} Dateien pro Vorlage.`,
    };
  }

  const uploadedKeys: string[] = [];

  try {
    return await withTenantDb(tenantId, async (tx) => {
      const [row] = await tx
        .insert(templates)
        .values({
          tenantId,
          title: input.title.trim(),
          description: input.description.trim(),
          module: input.module,
          createdBy: userId,
        })
        .returning();

      const fileRows: TemplateFileRow[] = [];

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const fileId = crypto.randomUUID();
        const safeName = sanitizeFilename(file.name);
        const storageKey = `tenants/${tenantId}/templates/${row.id}/${fileId}-${safeName}`;
        const buffer = new Uint8Array(await file.arrayBuffer());
        const mimeType = file.type || "application/octet-stream";

        await uploadObject(storageKey, buffer, mimeType);
        uploadedKeys.push(storageKey);

        const [fileRow] = await tx
          .insert(templateFiles)
          .values({
            id: fileId,
            tenantId,
            templateId: row.id,
            storageKey,
            filename: file.name.trim() || safeName,
            mimeType,
            sizeBytes: file.size,
            sortOrder: index,
            uploadedBy: userId,
          })
          .returning();

        fileRows.push(fileRow);
      }

      return {
        template: toTemplate(row, fileRows.map(toTemplateFile)),
      };
    });
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => deleteObject(key)));
    throw error;
  }
}

export async function updateTemplateMetaRow(
  tenantId: string,
  id: string,
  input: Pick<TemplateInput, "title" | "description">
): Promise<Template | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(templates)
      .set({
        title: input.title.trim(),
        description: input.description.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)))
      .returning();

    if (!row) return null;

    const filesByTemplate = await loadFilesForTemplates(tx, tenantId, [id]);
    return toTemplate(row, filesByTemplate.get(id) ?? []);
  });
}

export async function addTemplateFilesRow(
  tenantId: string,
  templateId: string,
  userId: string,
  files: File[]
): Promise<{ template?: Template; error?: string }> {
  if (files.length === 0) {
    return { error: "Keine Dateien ausgewählt." };
  }

  const uploadedKeys: string[] = [];

  try {
    return await withTenantDb(tenantId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(templates)
        .where(
          and(eq(templates.id, templateId), eq(templates.tenantId, tenantId))
        )
        .limit(1);

      if (!existing) {
        return { error: "Vorlage nicht gefunden." };
      }

      const currentFiles = await tx
        .select({ id: templateFiles.id })
        .from(templateFiles)
        .where(
          and(
            eq(templateFiles.templateId, templateId),
            eq(templateFiles.tenantId, tenantId)
          )
        );

      if (currentFiles.length + files.length > MAX_FILES_PER_TEMPLATE) {
        return {
          error: `Maximal ${MAX_FILES_PER_TEMPLATE} Dateien pro Vorlage.`,
        };
      }

      const startOrder = currentFiles.length;

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const fileId = crypto.randomUUID();
        const safeName = sanitizeFilename(file.name);
        const storageKey = `tenants/${tenantId}/templates/${templateId}/${fileId}-${safeName}`;
        const buffer = new Uint8Array(await file.arrayBuffer());
        const mimeType = file.type || "application/octet-stream";

        await uploadObject(storageKey, buffer, mimeType);
        uploadedKeys.push(storageKey);

        await tx.insert(templateFiles).values({
          id: fileId,
          tenantId,
          templateId,
          storageKey,
          filename: file.name.trim() || safeName,
          mimeType,
          sizeBytes: file.size,
          sortOrder: startOrder + index,
          uploadedBy: userId,
        });
      }

      await tx
        .update(templates)
        .set({ updatedAt: new Date().toISOString() })
        .where(
          and(eq(templates.id, templateId), eq(templates.tenantId, tenantId))
        );

      const [updated] = await tx
        .select()
        .from(templates)
        .where(
          and(eq(templates.id, templateId), eq(templates.tenantId, tenantId))
        )
        .limit(1);

      const filesByTemplate = await loadFilesForTemplates(tx, tenantId, [
        templateId,
      ]);
      return {
        template: toTemplate(
          updated ?? existing,
          filesByTemplate.get(templateId) ?? []
        ),
      };
    });
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => deleteObject(key)));
    throw error;
  }
}

export async function deleteTemplateFileRow(
  tenantId: string,
  fileId: string
): Promise<{ template?: Template; error?: string }> {
  return withTenantDb(tenantId, async (tx) => {
    const [file] = await tx
      .select()
      .from(templateFiles)
      .where(
        and(eq(templateFiles.id, fileId), eq(templateFiles.tenantId, tenantId))
      )
      .limit(1);

    if (!file) {
      return { error: "Datei nicht gefunden." };
    }

    const remaining = await tx
      .select({ id: templateFiles.id })
      .from(templateFiles)
      .where(
        and(
          eq(templateFiles.templateId, file.templateId),
          eq(templateFiles.tenantId, tenantId)
        )
      );

    if (remaining.length <= 1) {
      return {
        error: "Mindestens eine Datei muss an der Vorlage bleiben.",
      };
    }

    await tx
      .delete(templateFiles)
      .where(
        and(eq(templateFiles.id, fileId), eq(templateFiles.tenantId, tenantId))
      );

    await deleteObject(file.storageKey).catch(() => undefined);

    await tx
      .update(templates)
      .set({ updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(templates.id, file.templateId),
          eq(templates.tenantId, tenantId)
        )
      );

    const [templateRow] = await tx
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.id, file.templateId),
          eq(templates.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!templateRow) {
      return { error: "Vorlage nicht gefunden." };
    }

    const filesByTemplate = await loadFilesForTemplates(tx, tenantId, [
      file.templateId,
    ]);
    return {
      template: toTemplate(
        templateRow,
        filesByTemplate.get(file.templateId) ?? []
      ),
    };
  });
}

export async function deleteTemplateRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  const keys = await withTenantDb(tenantId, async (tx) => {
    const files = await tx
      .select({ storageKey: templateFiles.storageKey })
      .from(templateFiles)
      .where(
        and(
          eq(templateFiles.templateId, id),
          eq(templateFiles.tenantId, tenantId)
        )
      );

    const deleted = await tx
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)))
      .returning({ id: templates.id });

    if (deleted.length === 0) return null;
    return files.map((f) => f.storageKey);
  });

  if (!keys) return false;

  await Promise.allSettled(keys.map((key) => deleteObject(key)));
  return true;
}

export async function getTemplateFileById(
  tenantId: string,
  fileId: string
): Promise<{
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  module: Template["module"];
} | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: templateFiles.id,
        storageKey: templateFiles.storageKey,
        filename: templateFiles.filename,
        mimeType: templateFiles.mimeType,
        module: templates.module,
      })
      .from(templateFiles)
      .innerJoin(templates, eq(templates.id, templateFiles.templateId))
      .where(
        and(
          eq(templateFiles.id, fileId),
          eq(templateFiles.tenantId, tenantId),
          eq(templates.tenantId, tenantId)
        )
      )
      .limit(1);

    return row ?? null;
  });
}
