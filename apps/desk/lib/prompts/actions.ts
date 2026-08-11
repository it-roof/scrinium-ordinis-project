"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/tenant/session";
import {
  createPromptRow,
  deletePromptRow,
  updatePromptRow,
} from "./storage";
import { normalizeTagList } from "./tag-utils";
import type { PromptInput } from "./types";

function validateInput(input: PromptInput): string | null {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) return "Bitte einen Titel angeben.";
  if (!content) return "Bitte einen Prompt-Text angeben.";

  return null;
}

export async function createPrompt(input: PromptInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await createPromptRow(user.tenantId, {
    ...input,
    tags: normalizeTagList(input.tags),
  });
  revalidatePath("/prompt");
  revalidatePath("/prompt/neu");

  return { success: true as const, item };
}

export async function updatePrompt(id: string, input: PromptInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await updatePromptRow(user.tenantId, id, {
    ...input,
    tags: normalizeTagList(input.tags),
  });

  if (!item) {
    return { success: false as const, error: "Prompt nicht gefunden." };
  }

  revalidatePath("/prompt");
  revalidatePath(`/prompt/${id}/bearbeiten`);

  return { success: true as const, item };
}

export async function deletePrompt(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const deleted = await deletePromptRow(user.tenantId, id);

  if (!deleted) {
    return { success: false as const, error: "Prompt nicht gefunden." };
  }

  revalidatePath("/prompt");

  return { success: true as const };
}
