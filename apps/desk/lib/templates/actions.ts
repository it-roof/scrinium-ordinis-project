"use server";

import { revalidatePath } from "next/cache";

import { areaOwnsFunction } from "@/lib/area/functions";
import type { AppModuleId } from "@/lib/modules";
import { isAppModuleId } from "@/lib/modules";
import { assertUserCanAccessContentModule } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  addTemplateFilesRow,
  createTemplateRow,
  deleteTemplateFileRow,
  deleteTemplateRow,
  getTemplateById,
  getTemplateFileById,
  updateTemplateMetaRow,
} from "./storage";
import {
  validateTemplateFile,
  type TemplateInput,
} from "./types";

function revalidateTemplates(module: AppModuleId) {
  revalidatePath("/", "layout");
  if (module === "tax") {
    revalidatePath("/steuer/vorlagen");
  }
}

async function assertTemplatesModuleAccess(
  userId: string,
  tenantId: string,
  module: string
) {
  if (!isAppModuleId(module) || !areaOwnsFunction(module, "templates")) {
    return "Vorlagen sind in diesem Bereich nicht verfügbar." as const;
  }
  return assertUserCanAccessContentModule(userId, tenantId, module);
}

function parseFiles(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function createTemplate(formData: FormData) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const moduleRaw = String(formData.get("module") ?? "tax");
  const files = parseFiles(formData);

  if (!title.trim()) {
    return { success: false as const, error: "Bitte einen Titel angeben." };
  }

  const accessError = await assertTemplatesModuleAccess(
    user.id,
    user.tenantId,
    moduleRaw
  );
  if (accessError) {
    return { success: false as const, error: accessError };
  }

  const module = moduleRaw as AppModuleId;
  for (const file of files) {
    const fileError = validateTemplateFile(file);
    if (fileError) {
      return { success: false as const, error: fileError };
    }
  }

  const input: TemplateInput = {
    title,
    description,
    module,
  };

  try {
    const result = await createTemplateRow(
      user.tenantId,
      input,
      user.id,
      files
    );
    if (result.error || !result.template) {
      return {
        success: false as const,
        error: result.error ?? "Speichern fehlgeschlagen.",
      };
    }

    revalidateTemplates(module);
    return { success: true as const, template: result.template };
  } catch {
    return {
      success: false as const,
      error: "Hochladen fehlgeschlagen. Bitte erneut versuchen.",
    };
  }
}

export async function updateTemplateMeta(
  id: string,
  input: { title: string; description: string }
) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  if (!input.title.trim()) {
    return { success: false as const, error: "Bitte einen Titel angeben." };
  }

  const existing = await getTemplateById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Vorlage nicht gefunden." };
  }

  const accessError = await assertTemplatesModuleAccess(
    user.id,
    user.tenantId,
    existing.module
  );
  if (accessError) {
    return { success: false as const, error: accessError };
  }

  const template = await updateTemplateMetaRow(user.tenantId, id, input);
  if (!template) {
    return { success: false as const, error: "Vorlage nicht gefunden." };
  }

  revalidateTemplates(template.module as AppModuleId);
  return { success: true as const, template };
}

export async function addTemplateFiles(templateId: string, formData: FormData) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const existing = await getTemplateById(user.tenantId, templateId);
  if (!existing) {
    return { success: false as const, error: "Vorlage nicht gefunden." };
  }

  const accessError = await assertTemplatesModuleAccess(
    user.id,
    user.tenantId,
    existing.module
  );
  if (accessError) {
    return { success: false as const, error: accessError };
  }

  const files = parseFiles(formData);
  for (const file of files) {
    const fileError = validateTemplateFile(file);
    if (fileError) {
      return { success: false as const, error: fileError };
    }
  }

  try {
    const result = await addTemplateFilesRow(
      user.tenantId,
      templateId,
      user.id,
      files
    );
    if (result.error || !result.template) {
      return {
        success: false as const,
        error: result.error ?? "Hochladen fehlgeschlagen.",
      };
    }

    revalidateTemplates(result.template.module as AppModuleId);
    return { success: true as const, template: result.template };
  } catch {
    return {
      success: false as const,
      error: "Hochladen fehlgeschlagen. Bitte erneut versuchen.",
    };
  }
}

export async function deleteTemplateFile(fileId: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const file = await getTemplateFileById(user.tenantId, fileId);
  if (!file) {
    return { success: false as const, error: "Datei nicht gefunden." };
  }

  const accessError = await assertTemplatesModuleAccess(
    user.id,
    user.tenantId,
    file.module
  );
  if (accessError) {
    return { success: false as const, error: accessError };
  }

  const result = await deleteTemplateFileRow(user.tenantId, fileId);
  if (result.error || !result.template) {
    return {
      success: false as const,
      error: result.error ?? "Löschen fehlgeschlagen.",
    };
  }

  revalidateTemplates(result.template.module as AppModuleId);
  return { success: true as const, template: result.template };
}

export async function deleteTemplate(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const existing = await getTemplateById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Vorlage nicht gefunden." };
  }

  const accessError = await assertTemplatesModuleAccess(
    user.id,
    user.tenantId,
    existing.module
  );
  if (accessError) {
    return { success: false as const, error: accessError };
  }

  const deleted = await deleteTemplateRow(user.tenantId, id);
  if (!deleted) {
    return { success: false as const, error: "Vorlage nicht gefunden." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/steuer/vorlagen");
  return { success: true as const };
}
