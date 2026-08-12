"use server";

import { revalidatePath } from "next/cache";

import { assertUserCanAccessContentModule } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";
import {
  createTextBlockRow,
  deleteTextBlockRow,
  getTextBlockById,
  updateTextBlockRow,
} from "./storage";
import { CONTENT_MODULES, type ContentModule, type TextBlockInput } from "./types";

function isValidModule(value: string): value is ContentModule {
  return CONTENT_MODULES.some((entry) => entry.value === value);
}

function validateInput(input: TextBlockInput): string | null {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) return "Bitte einen Titel angeben.";
  if (!content) return "Bitte einen Inhalt angeben.";
  if (!isValidModule(input.module)) {
    return "Bitte einen gültigen Bereich wählen.";
  }

  return null;
}

export async function createTextBlock(input: TextBlockInput) {
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

  const item = await createTextBlockRow(user.tenantId, input);
  revalidatePath("/", "layout");

  return { success: true as const, item };
}

export async function updateTextBlock(id: string, input: TextBlockInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const existing = await getTextBlockById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Textbaustein nicht gefunden." };
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

  const item = await updateTextBlockRow(user.tenantId, id, input);

  if (!item) {
    return { success: false as const, error: "Textbaustein nicht gefunden." };
  }

  revalidatePath("/", "layout");

  return { success: true as const, item };
}

export async function deleteTextBlock(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const existing = await getTextBlockById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Textbaustein nicht gefunden." };
  }

  const denied = await assertUserCanAccessContentModule(
    user.id,
    user.tenantId,
    existing.module
  );
  if (denied) {
    return { success: false as const, error: denied };
  }

  const deleted = await deleteTextBlockRow(user.tenantId, id);

  if (!deleted) {
    return { success: false as const, error: "Textbaustein nicht gefunden." };
  }

  revalidatePath("/", "layout");

  return { success: true as const };
}
