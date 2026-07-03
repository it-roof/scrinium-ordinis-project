"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createPromptRow,
  deletePromptRow,
  updatePromptRow,
} from "./storage";
import type { PromptInput } from "./types";

function validateInput(input: PromptInput): string | null {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) return "Bitte einen Titel angeben.";
  if (!content) return "Bitte einen Prompt-Text angeben.";

  return null;
}

async function requireUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function createPrompt(input: PromptInput) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await createPromptRow(input);
  revalidatePath("/prompt");

  return { success: true as const, item };
}

export async function updatePrompt(id: string, input: PromptInput) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await updatePromptRow(id, input);

  if (!item) {
    return { success: false as const, error: "Prompt nicht gefunden." };
  }

  revalidatePath("/prompt");

  return { success: true as const, item };
}

export async function deletePrompt(id: string) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const deleted = await deletePromptRow(id);

  if (!deleted) {
    return { success: false as const, error: "Prompt nicht gefunden." };
  }

  revalidatePath("/prompt");

  return { success: true as const };
}
