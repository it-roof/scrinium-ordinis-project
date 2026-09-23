"use server";

import { revalidatePath } from "next/cache";

import {
  approveAiDraft,
  discardAiDraft,
  getAiDraftById,
  listAiDraftsForMatter,
  updateAiDraftContent,
} from "@/lib/ai/drafts-storage";
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

export async function listMatterAiDrafts(matterId: string) {
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
  const items = await listAiDraftsForMatter(user.tenantId, matterId);
  return { success: true as const, items };
}

export async function saveAiDraftEdits(draftId: string, content: string) {
  const { user, error } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const existing = await getAiDraftById(user.tenantId, draftId);
  if (!existing) {
    return {
      success: false as const,
      error: userMessageForAiError(AI_ERROR.NOT_FOUND),
    };
  }
  const item = await updateAiDraftContent({
    tenantId: user.tenantId,
    draftId,
    content,
  });
  if (!item) {
    return {
      success: false as const,
      error: "Entwurf kann nicht mehr bearbeitet werden.",
    };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function approveAiDraftAction(draftId: string) {
  const { user, error } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  if (user.deskRole !== "rechtsanwalt") {
    return {
      success: false as const,
      error: "Freigabe nur durch einen Rechtsanwalt.",
    };
  }
  const existing = await getAiDraftById(user.tenantId, draftId);
  if (!existing) {
    return {
      success: false as const,
      error: userMessageForAiError(AI_ERROR.NOT_FOUND),
    };
  }
  const item = await approveAiDraft({
    tenantId: user.tenantId,
    draftId,
    userId: user.id,
  });
  if (!item) {
    return {
      success: false as const,
      error: "Entwurf kann nicht freigegeben werden.",
    };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function discardAiDraftAction(draftId: string) {
  const { user, error } = await requireMattersUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const existing = await getAiDraftById(user.tenantId, draftId);
  if (!existing) {
    return {
      success: false as const,
      error: userMessageForAiError(AI_ERROR.NOT_FOUND),
    };
  }
  const item = await discardAiDraft({
    tenantId: user.tenantId,
    draftId,
  });
  if (!item) {
    return {
      success: false as const,
      error: "Entwurf kann nicht verworfen werden.",
    };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}
