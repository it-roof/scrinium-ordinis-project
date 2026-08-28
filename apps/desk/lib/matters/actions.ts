"use server";

import { revalidatePath } from "next/cache";

import {
  createMatterRow,
  deleteMatterRow,
  getMatterById,
  updateMatterRow,
} from "@/lib/matters/storage";
import type { MatterInput } from "@/lib/clients/types";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

async function requireMattersUser() {
  const user = await requireSessionUser();
  if (!user) {
    return { error: "Nicht angemeldet." as const, user: null };
  }
  // Akten: Übersicht oder Mandanten-Kontext
  const deniedMatters = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "matters"
  );
  if (!deniedMatters) {
    return { error: null, user };
  }
  const deniedClients = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "clients"
  );
  if (deniedClients) {
    return { error: deniedClients, user: null };
  }
  return { error: null, user };
}

function validate(input: Pick<MatterInput, "title" | "clientId">): string | null {
  if (!input.clientId.trim()) {
    return "Bitte einen Mandanten wählen.";
  }
  if (!input.title.trim()) {
    return "Bitte einen Aktentitel angeben.";
  }
  return null;
}

export async function createMatter(input: MatterInput) {
  const { error, user } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const validation = validate(input);
  if (validation) {
    return { success: false as const, error: validation };
  }
  const item = await createMatterRow(user.tenantId, user.id, {
    ...input,
    module: "legal",
  });
  if (!item) {
    return { success: false as const, error: "Mandant nicht gefunden." };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function updateMatter(
  id: string,
  input: Omit<MatterInput, "clientId">
) {
  const { error, user } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  if (!input.title.trim()) {
    return { success: false as const, error: "Bitte einen Aktentitel angeben." };
  }
  const existing = await getMatterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Akte nicht gefunden." };
  }
  const item = await updateMatterRow(user.tenantId, id, {
    ...input,
    module: existing.module,
  });
  if (!item) {
    return { success: false as const, error: "Akte nicht gefunden." };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function deleteMatter(id: string) {
  const { error, user } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const existing = await getMatterById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Akte nicht gefunden." };
  }
  const ok = await deleteMatterRow(user.tenantId, id);
  if (!ok) {
    return { success: false as const, error: "Löschen fehlgeschlagen." };
  }
  revalidatePath("/", "layout");
  return { success: true as const };
}
