"use server";

import { revalidatePath } from "next/cache";

import { practiceBasePath } from "@/lib/area/paths";
import { getMatterById } from "@/lib/matters/storage";
import type { PracticeId } from "@/lib/modules";
import { isAppModuleId } from "@/lib/modules";
import { uploadObject } from "@/lib/storage/s3";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  createMatterFileRow,
  deleteMatterFileRow,
  discardMatterFileObject,
  findMatterFileByFilename,
  listMatterFiles,
  matterFileObjectKey,
  renameMatterFileRow,
  replaceMatterFileRow,
} from "./files-storage";
import {
  MAX_MATTER_FILES_PER_UPLOAD,
  nextUniqueMatterFilename,
  normalizeMatterFilename,
  validateMatterFileMeta,
  type MatterFileRecord,
} from "./files-types";

type MatterFileActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; conflicts?: string[] };

export type MatterFileConflictPolicy = "replace" | "keepBoth" | "skip";

async function requireMattersContext(practice: PracticeId) {
  const user = await requireSessionUser();
  if (!user) {
    return { ok: false as const, error: "Bitte anmelden." };
  }
  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "matters"
  );
  if (denied) {
    return { ok: false as const, error: denied };
  }
  return { ok: true as const, user };
}

function revalidateMatter(practice: PracticeId, matterId: string) {
  revalidatePath(`${practiceBasePath(practice)}/akten/${matterId}`);
}

function parseConflictPolicies(raw: string): Record<string, MatterFileConflictPolicy> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, MatterFileConflictPolicy> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === "replace" || value === "keepBoth" || value === "skip") {
        out[normalizeMatterFilename(key)] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function listMatterFilesAction(params: {
  matterId: string;
  practice: PracticeId;
}): Promise<MatterFileActionResult<MatterFileRecord[]>> {
  const gate = await requireMattersContext(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const matter = await getMatterById(gate.user.tenantId, params.matterId);
  if (!matter || matter.module !== params.practice) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  const files = await listMatterFiles(
    gate.user.tenantId,
    params.matterId,
    params.practice
  );
  return { success: true, data: files };
}

export async function uploadMatterFilesAction(
  formData: FormData
): Promise<
  MatterFileActionResult<{
    created: MatterFileRecord[];
    replaced: MatterFileRecord[];
    skipped: string[];
    conflicts?: string[];
  }>
> {
  const matterId = String(formData.get("matterId") ?? "").trim();
  const practiceRaw = String(formData.get("practice") ?? "").trim();
  const policies = parseConflictPolicies(
    String(formData.get("conflictPolicies") ?? "")
  );

  if (!matterId) {
    return { success: false, error: "Akte fehlt." };
  }
  if (!isAppModuleId(practiceRaw)) {
    return { success: false, error: "Bereich ungültig." };
  }
  const practice = practiceRaw;

  const gate = await requireMattersContext(practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const matter = await getMatterById(gate.user.tenantId, matterId);
  if (!matter || matter.module !== practice) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  const rawFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (rawFiles.length === 0) {
    return { success: false, error: "Keine Datei ausgewählt." };
  }
  if (rawFiles.length > MAX_MATTER_FILES_PER_UPLOAD) {
    return {
      success: false,
      error: `Maximal ${MAX_MATTER_FILES_PER_UPLOAD} Dateien gleichzeitig.`,
    };
  }

  const existing = await listMatterFiles(
    gate.user.tenantId,
    matterId,
    practice
  );
  const occupiedNames = existing.map((file) => file.filename);
  const unresolved: string[] = [];

  for (const file of rawFiles) {
    const metaError = validateMatterFileMeta(file.name, file.size);
    if (metaError) {
      return { success: false, error: metaError };
    }
    const match = existing.find(
      (item) =>
        normalizeMatterFilename(item.filename) ===
        normalizeMatterFilename(file.name)
    );
    if (match && !policies[normalizeMatterFilename(file.name)]) {
      unresolved.push(file.name);
    }
  }

  if (unresolved.length > 0) {
    return {
      success: false,
      error: "Dateiname bereits vorhanden.",
      conflicts: unresolved,
    };
  }

  const created: MatterFileRecord[] = [];
  const replaced: MatterFileRecord[] = [];
  const skipped: string[] = [];
  const uploadedKeys: string[] = [];
  const oldKeysToDelete: string[] = [];

  try {
    for (const file of rawFiles) {
      const key = normalizeMatterFilename(file.name);
      const policy = policies[key];
      const existingMatch = await findMatterFileByFilename({
        tenantId: gate.user.tenantId,
        matterId,
        module: practice,
        filename: file.name,
      });

      if (existingMatch && policy === "skip") {
        skipped.push(file.name);
        continue;
      }

      let targetFilename = file.name.trim();
      if (existingMatch && policy === "keepBoth") {
        targetFilename = nextUniqueMatterFilename(file.name, [
          ...occupiedNames,
          ...created.map((item) => item.filename),
          ...replaced.map((item) => item.filename),
        ]);
      }

      const fileId =
        existingMatch && policy === "replace"
          ? existingMatch.id
          : crypto.randomUUID();
      const storageKey = matterFileObjectKey(
        gate.user.tenantId,
        matterId,
        fileId,
        targetFilename
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadObject(
        storageKey,
        buffer,
        file.type || "application/octet-stream"
      );
      uploadedKeys.push(storageKey);

      if (existingMatch && policy === "replace") {
        const row = await replaceMatterFileRow({
          tenantId: gate.user.tenantId,
          fileId: existingMatch.id,
          storageKey,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          filename: targetFilename,
        });
        if (!row) {
          throw new Error("Datei konnte nicht ersetzt werden.");
        }
        if (row.previousStorageKey !== storageKey) {
          oldKeysToDelete.push(row.previousStorageKey);
        }
        replaced.push(row);
        occupiedNames.push(row.filename);
        continue;
      }

      const row = await createMatterFileRow({
        tenantId: gate.user.tenantId,
        userId: gate.user.id,
        matterId,
        module: practice,
        storageKey,
        filename: targetFilename,
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Datei-Upload fehlgeschlagen.",
    };
  }

  await Promise.all(oldKeysToDelete.map((key) => discardMatterFileObject(key)));
  revalidateMatter(practice, matterId);
  return {
    success: true,
    data: { created, replaced, skipped },
  };
}

export async function renameMatterFileAction(params: {
  fileId: string;
  matterId: string;
  practice: PracticeId;
  filename: string;
}): Promise<MatterFileActionResult<MatterFileRecord>> {
  const gate = await requireMattersContext(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const filename = params.filename.trim().slice(0, 200);
  if (!filename) {
    return { success: false, error: "Dateiname fehlt." };
  }

  const matter = await getMatterById(gate.user.tenantId, params.matterId);
  if (!matter || matter.module !== params.practice) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  const clash = await findMatterFileByFilename({
    tenantId: gate.user.tenantId,
    matterId: params.matterId,
    module: params.practice,
    filename,
  });
  if (clash && clash.id !== params.fileId) {
    return {
      success: false,
      error: "Eine Datei mit diesem Namen existiert bereits.",
    };
  }

  const item = await renameMatterFileRow({
    tenantId: gate.user.tenantId,
    fileId: params.fileId,
    filename,
  });
  if (!item || item.matterId !== params.matterId) {
    return { success: false, error: "Datei nicht gefunden." };
  }

  revalidateMatter(params.practice, params.matterId);
  return { success: true, data: item };
}

export async function deleteMatterFileAction(params: {
  fileId: string;
  matterId: string;
  practice: PracticeId;
}): Promise<MatterFileActionResult<{ fileId: string }>> {
  const gate = await requireMattersContext(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const matter = await getMatterById(gate.user.tenantId, params.matterId);
  if (!matter || matter.module !== params.practice) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  const deleted = await deleteMatterFileRow(gate.user.tenantId, params.fileId);
  if (!deleted) {
    return { success: false, error: "Datei nicht gefunden." };
  }

  await discardMatterFileObject(deleted.storageKey);
  revalidateMatter(params.practice, params.matterId);
  return { success: true, data: { fileId: params.fileId } };
}
