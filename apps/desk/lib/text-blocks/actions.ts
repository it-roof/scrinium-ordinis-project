"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/tenant/session";
import {
  createTextBlockRow,
  deleteTextBlockRow,
  updateTextBlockRow,
} from "./storage";
import { DEPARTMENTS, type Department, type TextBlockInput } from "./types";

function isValidDepartment(value: string): value is Department {
  return DEPARTMENTS.some((department) => department.value === value);
}

function validateInput(input: TextBlockInput): string | null {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) return "Bitte einen Titel angeben.";
  if (!content) return "Bitte einen Inhalt angeben.";
  if (!isValidDepartment(input.department)) {
    return "Bitte einen gültigen Bereich wählen.";
  }

  return null;
}

export async function createTextBlock(input: TextBlockInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await createTextBlockRow(user.tenantId, input);
  revalidatePath("/textbausteine");

  return { success: true as const, item };
}

export async function updateTextBlock(id: string, input: TextBlockInput) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const error = validateInput(input);
  if (error) return { success: false as const, error };

  const item = await updateTextBlockRow(user.tenantId, id, input);

  if (!item) {
    return { success: false as const, error: "Textbaustein nicht gefunden." };
  }

  revalidatePath("/textbausteine");

  return { success: true as const, item };
}

export async function deleteTextBlock(id: string) {
  const user = await requireSessionUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };

  const deleted = await deleteTextBlockRow(user.tenantId, id);

  if (!deleted) {
    return { success: false as const, error: "Textbaustein nicht gefunden." };
  }

  revalidatePath("/textbausteine");

  return { success: true as const };
}
