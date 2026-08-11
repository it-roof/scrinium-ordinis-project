"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { validateUploadFile } from "@/lib/docs/upload-policy";

import {
  createDocPageRow,
  deleteDocAssetRow,
  deleteDocPageRow,
  getDocAssetsByIds,
  updateDocPageRow,
  uploadDocAssetRow,
} from "./storage";
import type { DocPageInput } from "./types";

function validateInput(input: DocPageInput): string | null {
  const title = input.title.trim();

  if (!title) return "Bitte einen Titel angeben.";

  return null;
}

async function requireUser() {
  const session = await auth();
  return session?.user ?? null;
}

function revalidateDocs(slug?: string) {
  revalidatePath("/dokumentation");

  if (slug) {
    revalidatePath(`/dokumentation/${slug}`);
    revalidatePath(`/dokumentation/${slug}/bearbeiten`);
  }

  revalidatePath("/dokumentation/neu");
}

export async function createDocPage(input: DocPageInput) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const result = await createDocPageRow(input, user.id);

  if (result.error || !result.page) {
    return { success: false as const, error: result.error ?? "Speichern fehlgeschlagen." };
  }

  revalidateDocs(result.page.slug);

  return { success: true as const, page: result.page };
}

export async function updateDocPage(id: string, input: DocPageInput) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const result = await updateDocPageRow(id, input, user.id);

  if (result.error || !result.page) {
    return { success: false as const, error: result.error ?? "Speichern fehlgeschlagen." };
  }

  revalidateDocs(result.page.slug);

  return { success: true as const, page: result.page };
}

export async function deleteDocPage(id: string) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const deleted = await deleteDocPageRow(id);

  if (!deleted) {
    return { success: false as const, error: "Seite nicht gefunden." };
  }

  revalidateDocs();

  return { success: true as const };
}

export async function uploadDocAsset(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false as const, error: "Keine Datei übermittelt." };
  }

  const validationError = validateUploadFile(file);

  if (validationError) {
    return { success: false as const, error: validationError };
  }

  try {
    const result = await uploadDocAssetRow(file, user.id);

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
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const assets = await getDocAssetsByIds(ids);

  return { success: true as const, assets };
}

export async function deleteDocAsset(assetId: string, pageId?: string) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const result = await deleteDocAssetRow(assetId, pageId);

  if (result.error) {
    return { success: false as const, error: result.error };
  }

  return { success: true as const };
}
