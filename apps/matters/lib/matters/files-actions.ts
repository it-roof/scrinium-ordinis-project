"use server";

import { practiceForDeskRole } from "@/lib/chat/practice";
import {
  createMatterFileRow,
  discardMatterFileObject,
  findMatterFileByFilename,
  listMatterFiles,
  matterFileObjectKey,
} from "@/lib/matters/files-storage";
import {
  MAX_MATTER_FILES_PER_UPLOAD,
  nextUniqueMatterFilename,
  validateMatterFileMeta,
  type MatterFileRecord,
} from "@/lib/matters/files-types";
import { getPracticeMatter } from "@/lib/matters/storage";
import { uploadObject } from "@/lib/storage/s3";
import { requireTenantUser } from "@/lib/tenant/session";

type FileActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function listMatterFilesAction(
  matterId: string
): Promise<FileActionResult<MatterFileRecord[]>> {
  const user = await requireTenantUser();
  if (!matterId.trim()) {
    return { success: false, error: "Akte nicht gefunden." };
  }
  const practice = practiceForDeskRole(user.deskRole);
  const matter = await getPracticeMatter({
    tenantId: user.tenantId,
    practice,
    matterId,
  });
  if (!matter) {
    return { success: false, error: "Akte nicht gefunden." };
  }
  try {
    const files = await listMatterFiles(user.tenantId, matterId, practice);
    return { success: true, data: files };
  } catch (error) {
    console.error("[listMatterFilesAction]", error);
    return { success: false, error: "Dateien konnten nicht geladen werden." };
  }
}

export async function uploadMatterFilesAction(
  formData: FormData
): Promise<FileActionResult<MatterFileRecord[]>> {
  const user = await requireTenantUser();
  const matterId = String(formData.get("matterId") ?? "").trim();
  if (!matterId) {
    return { success: false, error: "Akte fehlt." };
  }

  const practice = practiceForDeskRole(user.deskRole);
  const matter = await getPracticeMatter({
    tenantId: user.tenantId,
    practice,
    matterId,
  });
  if (!matter) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  const result = await storeMatterFiles({
    tenantId: user.tenantId,
    userId: user.id,
    matterId,
    practice,
    files: formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0),
  });
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.files };
}

export async function storeMatterFiles(params: {
  tenantId: string;
  userId: string;
  matterId: string;
  practice: ReturnType<typeof practiceForDeskRole>;
  files: File[];
}): Promise<{ ok: true; files: MatterFileRecord[] } | { ok: false; error: string }> {
  if (params.files.length === 0) {
    return { ok: true, files: [] };
  }
  if (params.files.length > MAX_MATTER_FILES_PER_UPLOAD) {
    return {
      ok: false,
      error: `Maximal ${MAX_MATTER_FILES_PER_UPLOAD} Dateien gleichzeitig.`,
    };
  }

  const existing = await listMatterFiles(
    params.tenantId,
    params.matterId,
    params.practice
  );
  const occupiedNames = existing.map((file) => file.filename);

  for (const file of params.files) {
    const metaError = validateMatterFileMeta(file.name, file.size);
    if (metaError) {
      return { ok: false, error: metaError };
    }
  }

  const created: MatterFileRecord[] = [];
  const uploadedKeys: string[] = [];

  try {
    for (const file of params.files) {
      const existingMatch = await findMatterFileByFilename({
        tenantId: params.tenantId,
        matterId: params.matterId,
        module: params.practice,
        filename: file.name,
      });
      const filename = existingMatch
        ? nextUniqueMatterFilename(file.name, [
            ...occupiedNames,
            ...created.map((item) => item.filename),
          ])
        : file.name.trim();
      const fileId = crypto.randomUUID();
      const storageKey = matterFileObjectKey(
        params.tenantId,
        params.matterId,
        fileId,
        filename
      );
      const buffer = new Uint8Array(await file.arrayBuffer());
      await uploadObject(
        storageKey,
        buffer,
        file.type || "application/octet-stream"
      );
      uploadedKeys.push(storageKey);

      const row = await createMatterFileRow({
        tenantId: params.tenantId,
        userId: params.userId,
        matterId: params.matterId,
        module: params.practice,
        storageKey,
        filename,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      if (!row) {
        throw new Error("Datei konnte nicht gespeichert werden.");
      }
      created.push(row);
      occupiedNames.push(row.filename);
    }
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => discardMatterFileObject(key)));
    console.error("[storeMatterFiles]", error);
    return { ok: false, error: "Dateien konnten nicht gespeichert werden." };
  }

  return { ok: true, files: created };
}
