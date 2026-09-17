"use server";

import { revalidatePath } from "next/cache";

import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";
import { canManagePromptCatalog } from "./catalog";
import {
  createPromptRow,
  deletePromptRow,
  findPromptByNumber,
  renamePromptTagRow,
  updatePromptNumberRow,
  updatePromptRow,
} from "./storage";
import { normalizeTagList } from "./tag-utils";
import type { Prompt, PromptInput } from "./types";

function validateInput(input: PromptInput): string | null {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) return "Bitte einen Titel angeben.";
  if (!content) return "Bitte einen Prompt-Text angeben.";
  if (
    input.number !== null &&
    (!Number.isInteger(input.number) || input.number < 1)
  ) {
    return "Bitte eine ganze Zahl ab 1 als Nummer angeben.";
  }

  return null;
}

function isPromptError(
  value: Prompt | { error: string } | null
): value is { error: string } {
  return value !== null && typeof value === "object" && "error" in value;
}

async function assertPromptsAccess(userId: string, tenantId: string) {
  return assertUserCanAccessAreaFunction(userId, tenantId, "prompts");
}

async function assertCatalogManageAccess(tenantId: string) {
  if (!(await canManagePromptCatalog(tenantId))) {
    return "Die gemeinsame Prompt-Bibliothek kann nur von Dr. Schneiderbanger verwaltet werden.";
  }
  return null;
}

export async function checkPromptNumber(
  number: number,
  excludeId?: string
) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertPromptsAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  if (!Number.isInteger(number) || number < 1) {
    return {
      success: false as const,
      error: "Bitte eine ganze Zahl ab 1 als Nummer angeben.",
    };
  }

  const existing = await findPromptByNumber(number, excludeId);
  if (existing) {
    return {
      success: true as const,
      available: false as const,
      takenBy: { id: existing.id, title: existing.title, number: existing.number },
    };
  }

  return { success: true as const, available: true as const };
}

export async function createPrompt(input: PromptInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertPromptsAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const manageDenied = await assertCatalogManageAccess(user.tenantId);
  if (manageDenied) return { success: false as const, error: manageDenied };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await createPromptRow({
    ...input,
    tags: normalizeTagList(input.tags),
  });

  if (isPromptError(item)) {
    return { success: false as const, error: item.error };
  }

  revalidatePath("/", "layout");

  return { success: true as const, item };
}

export async function updatePrompt(id: string, input: PromptInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertPromptsAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const manageDenied = await assertCatalogManageAccess(user.tenantId);
  if (manageDenied) return { success: false as const, error: manageDenied };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await updatePromptRow(id, {
    ...input,
    tags: normalizeTagList(input.tags),
  });

  if (!item) {
    return { success: false as const, error: "Prompt nicht gefunden." };
  }

  if (isPromptError(item)) {
    return { success: false as const, error: item.error };
  }

  revalidatePath("/", "layout");

  return { success: true as const, item };
}

export async function updatePromptNumber(id: string, number: number) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertPromptsAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const manageDenied = await assertCatalogManageAccess(user.tenantId);
  if (manageDenied) return { success: false as const, error: manageDenied };

  const item = await updatePromptNumberRow(id, number);

  if (!item) {
    return { success: false as const, error: "Prompt nicht gefunden." };
  }

  if (isPromptError(item)) {
    return { success: false as const, error: item.error };
  }

  revalidatePath("/", "layout");

  return { success: true as const, item };
}

export async function renamePromptTag(tagId: string, name: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertPromptsAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const manageDenied = await assertCatalogManageAccess(user.tenantId);
  if (manageDenied) return { success: false as const, error: manageDenied };

  const result = await renamePromptTagRow(tagId, name);

  if (!result.ok) {
    return { success: false as const, error: result.error };
  }

  revalidatePath("/", "layout");

  return {
    success: true as const,
    tag: result.tag,
    merged: result.merged,
  };
}

export async function deletePrompt(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const denied = await assertPromptsAccess(user.id, user.tenantId);
  if (denied) return { success: false as const, error: denied };

  const manageDenied = await assertCatalogManageAccess(user.tenantId);
  if (manageDenied) return { success: false as const, error: manageDenied };

  const deleted = await deletePromptRow(id);

  if (!deleted) {
    return { success: false as const, error: "Prompt nicht gefunden." };
  }

  revalidatePath("/", "layout");

  return { success: true as const };
}
