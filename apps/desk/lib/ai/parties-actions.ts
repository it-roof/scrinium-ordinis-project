"use server";

import { revalidatePath } from "next/cache";

import {
  createMatterParty,
  deleteMatterParty,
  listMatterParties,
  type MatterPartyInput,
  type MatterPartyRecord,
} from "@/lib/ai/parties-storage";
import { AI_ERROR, userMessageForAiError } from "@/lib/ai/errors";
import { getMatterById } from "@/lib/matters/storage";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

async function requireMattersUser() {
  const user = await requireSessionUser();
  if (!user) {
    return { error: "Nicht angemeldet.", user: null };
  }
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

export async function getMatterPartiesAction(
  matterId: string
): Promise<
  | { success: true; items: MatterPartyRecord[] }
  | { success: false; error: string }
> {
  const { user, error } = await requireMattersUser();
  if (!user) {
    return { success: false, error: error ?? "Nicht angemeldet." };
  }
  const matter = await getMatterById(user.tenantId, matterId);
  if (!matter) {
    return { success: false, error: userMessageForAiError(AI_ERROR.FORBIDDEN) };
  }
  const items = await listMatterParties(user.tenantId, matterId);
  return { success: true, items };
}

export async function createMatterPartyAction(
  matterId: string,
  input: MatterPartyInput
) {
  const { user, error } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const matter = await getMatterById(user.tenantId, matterId);
  if (!matter) {
    return {
      success: false as const,
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
    };
  }
  if (!input.name.trim() && input.kind === "company") {
    return { success: false as const, error: "Bitte einen Namen angeben." };
  }
  if (
    input.kind === "person" &&
    !input.firstName?.trim() &&
    !input.lastName?.trim() &&
    !input.name.trim()
  ) {
    return { success: false as const, error: "Bitte einen Namen angeben." };
  }
  const item = await createMatterParty(user.tenantId, matterId, input);
  if (!item) {
    return { success: false as const, error: "Partei konnte nicht angelegt werden." };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function deleteMatterPartyAction(partyId: string, matterId: string) {
  const { user, error } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const matter = await getMatterById(user.tenantId, matterId);
  if (!matter) {
    return {
      success: false as const,
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
    };
  }
  const ok = await deleteMatterParty(user.tenantId, partyId);
  if (!ok) {
    return { success: false as const, error: "Partei nicht gefunden." };
  }
  revalidatePath("/", "layout");
  return { success: true as const };
}
