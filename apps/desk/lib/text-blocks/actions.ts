"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/tenant/session";
import { getTenantEnabledModules } from "@/lib/tenant/modules";
import { isAppModuleId } from "@/lib/modules";
import {
  createTextBlockRow,
  deleteTextBlockRow,
  updateTextBlockRow,
} from "./storage";
import { CONTENT_MODULES, type ContentModule, type TextBlockInput } from "./types";

function isValidModule(value: string): value is ContentModule {
  return CONTENT_MODULES.some((entry) => entry.value === value);
}

async function isAllowedModule(
  tenantId: string,
  module: string
): Promise<boolean> {
  if (!isValidModule(module)) {
    return false;
  }
  if (module === "general") {
    return true;
  }
  if (!isAppModuleId(module)) {
    return false;
  }
  const enabled = await getTenantEnabledModules(tenantId);
  return enabled.includes(module);
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

  if (!(await isAllowedModule(user.tenantId, input.module))) {
    return {
      success: false as const,
      error: "Dieser Bereich ist für die Kanzlei nicht freigeschaltet.",
    };
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

  if (!(await isAllowedModule(user.tenantId, input.module))) {
    return {
      success: false as const,
      error: "Dieser Bereich ist für die Kanzlei nicht freigeschaltet.",
    };
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

  const deleted = await deleteTextBlockRow(user.tenantId, id);

  if (!deleted) {
    return { success: false as const, error: "Textbaustein nicht gefunden." };
  }

  revalidatePath("/", "layout");

  return { success: true as const };
}
