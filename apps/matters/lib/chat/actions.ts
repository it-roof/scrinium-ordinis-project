"use server";

import { practiceForDeskRole } from "@/lib/chat/practice";
import {
  deleteOwnChat,
  getOwnChat,
  listOwnChats,
  setOwnChatPinned,
  type ChatListItem,
} from "@/lib/chat/storage";
import type { ChatWithLetter } from "@/lib/chat/types";
import { getLetterById } from "@/lib/letters/storage";
import { getPracticeMatter } from "@/lib/matters/storage";
import { requireTenantUser } from "@/lib/tenant/session";

export async function listChatsAction(
  matterId?: string | null
): Promise<ChatListItem[]> {
  const user = await requireTenantUser();
  const practice = practiceForDeskRole(user.deskRole);
  const scopedMatterId =
    typeof matterId === "string" ? matterId.trim() || null : matterId;

  if (scopedMatterId) {
    const matter = await getPracticeMatter({
      tenantId: user.tenantId,
      practice,
      matterId: scopedMatterId,
    });
    if (!matter) return [];
  }

  try {
    return await listOwnChats({
      tenantId: user.tenantId,
      userId: user.id,
      practice,
      ...(matterId === undefined ? {} : { matterId: scopedMatterId }),
    });
  } catch (error) {
    console.error("[listChatsAction]", error);
    return [];
  }
}

export async function getChatAction(
  chatId: string
): Promise<ChatWithLetter | null> {
  const user = await requireTenantUser();
  if (!chatId.trim()) return null;
  const chat = await getOwnChat({
    tenantId: user.tenantId,
    userId: user.id,
    practice: practiceForDeskRole(user.deskRole),
    chatId,
  });
  if (!chat) return null;
  const letter = chat.letterId
    ? await getLetterById(user.tenantId, chat.letterId)
    : null;
  return { ...chat, letter };
}

export async function pinChatAction(
  chatId: string,
  pinned: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireTenantUser();
  if (!chatId.trim() || chatId.startsWith("draft-")) {
    return { success: false, error: "Chat fehlt." };
  }
  const updated = await setOwnChatPinned({
    tenantId: user.tenantId,
    userId: user.id,
    practice: practiceForDeskRole(user.deskRole),
    chatId,
    pinned,
  });
  if (!updated) {
    return { success: false, error: "Chat nicht gefunden." };
  }
  return { success: true };
}

export async function deleteChatAction(
  chatId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireTenantUser();
  if (!chatId.trim()) {
    return { success: false, error: "Chat fehlt." };
  }
  const deleted = await deleteOwnChat({
    tenantId: user.tenantId,
    userId: user.id,
    practice: practiceForDeskRole(user.deskRole),
    chatId,
  });
  if (!deleted) {
    return { success: false, error: "Chat nicht gefunden." };
  }
  return { success: true };
}
