"use server";

import { revalidatePath } from "next/cache";

import { validateUploadFile } from "@/lib/docs/upload-policy";
import {
  assertUserCanAccessAreaFunction,
  assertUserCanAccessContentModule,
} from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  createDocPageRow,
  deleteDocAssetRow,
  deleteDocPageRow,
  getDocAssetsByIds,
  getDocPageById,
  updateDocPageRow,
  uploadDocAssetRow,
} from "./storage";
import type { DocPageInput } from "./types";
import { normalizeTagList } from "@/lib/prompts/tag-utils";

function validateInput(input: DocPageInput): string | null {
  const title = input.title.trim();

  if (!title) return "Bitte einen Titel angeben.";

  return null;
}

function revalidateDocs(slug?: string) {
  revalidatePath("/", "layout");

  if (slug) {
    revalidatePath(`/dokumentation/${slug}`);
  }
}

export async function createDocPage(input: DocPageInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const denied = await assertUserCanAccessContentModule(
    user.id,
    user.tenantId,
    input.module
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const normalized: DocPageInput = {
    ...input,
    tags: normalizeTagList(input.tags ?? []),
  };

  const result = await createDocPageRow(user.tenantId, normalized, user.id);

  if (result.error || !result.page) {
    return {
      success: false as const,
      error: result.error ?? "Speichern fehlgeschlagen.",
    };
  }

  revalidateDocs(result.page.slug);

  return { success: true as const, page: result.page };
}

export async function updateDocPage(id: string, input: DocPageInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const existing = await getDocPageById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Seite nicht gefunden." };
  }

  const existingDenied = await assertUserCanAccessContentModule(
    user.id,
    user.tenantId,
    existing.module
  );
  if (existingDenied) {
    return { success: false as const, error: existingDenied };
  }

  const targetDenied = await assertUserCanAccessContentModule(
    user.id,
    user.tenantId,
    input.module
  );
  if (targetDenied) {
    return { success: false as const, error: targetDenied };
  }

  const normalized: DocPageInput = {
    ...input,
    tags: normalizeTagList(input.tags ?? []),
  };

  const result = await updateDocPageRow(user.tenantId, id, normalized, user.id);

  if (result.error || !result.page) {
    return {
      success: false as const,
      error: result.error ?? "Speichern fehlgeschlagen.",
    };
  }

  revalidateDocs(result.page.slug);

  return { success: true as const, page: result.page };
}

export async function deleteDocPage(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const existing = await getDocPageById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Seite nicht gefunden." };
  }

  const denied = await assertUserCanAccessContentModule(
    user.id,
    user.tenantId,
    existing.module
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const deleted = await deleteDocPageRow(user.tenantId, id);

  if (!deleted) {
    return { success: false as const, error: "Seite nicht gefunden." };
  }

  revalidateDocs();

  return { success: true as const };
}

export async function uploadDocAsset(formData: FormData) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "docs"
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false as const, error: "Keine Datei übermittelt." };
  }

  const validationError = validateUploadFile(file);

  if (validationError) {
    return { success: false as const, error: validationError };
  }

  try {
    const result = await uploadDocAssetRow(user.tenantId, file, user.id);

    if (result.error || !result.asset || !result.markdown) {
      return {
        success: false as const,
        error: result.error ?? "Upload fehlgeschlagen.",
      };
    }

    return {
      success: true as const,
      asset: result.asset,
      markdown: result.markdown,
    };
  } catch {
    return { success: false as const, error: "Upload fehlgeschlagen." };
  }
}

export async function getDocAssets(ids: string[]) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "docs"
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const assets = await getDocAssetsByIds(user.tenantId, ids);

  return { success: true as const, assets };
}

export async function deleteDocAsset(assetId: string, pageId?: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "docs"
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  if (pageId) {
    const page = await getDocPageById(user.tenantId, pageId);
    if (!page) {
      return { success: false as const, error: "Seite nicht gefunden." };
    }
    const pageDenied = await assertUserCanAccessContentModule(
      user.id,
      user.tenantId,
      page.module
    );
    if (pageDenied) {
      return { success: false as const, error: pageDenied };
    }
  }

  const result = await deleteDocAssetRow(user.tenantId, assetId, pageId);

  if (result.error) {
    return { success: false as const, error: result.error };
  }

  return { success: true as const };
}
