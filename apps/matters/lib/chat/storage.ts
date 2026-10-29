import "server-only";

import { and, asc, desc, eq, exists, isNull } from "drizzle-orm";

import type { ChatPractice } from "@/lib/chat/practice";
import type {
  ChatDetail,
  ChatListItem,
  ChatMessageRecord,
} from "@/lib/chat/types";
import { matterAiChatMessages, matterAiChats } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type { ChatDetail, ChatListItem, ChatMessageRecord };

function asRole(role: string): ChatMessageRecord["role"] | null {
  if (role === "user" || role === "assistant") return role;
  return null;
}

function ownChat(
  tenantId: string,
  userId: string,
  practice: ChatPractice,
  chatId?: string
) {
  return and(
    eq(matterAiChats.tenantId, tenantId),
    eq(matterAiChats.createdBy, userId),
    eq(matterAiChats.module, practice),
    chatId ? eq(matterAiChats.id, chatId) : undefined
  );
}

export async function listOwnChats(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  matterId?: string | null;
}): Promise<ChatListItem[]> {
  return withTenantDb(params.tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: matterAiChats.id,
        title: matterAiChats.title,
        pinnedAt: matterAiChats.pinnedAt,
        matterId: matterAiChats.matterId,
        letterId: matterAiChats.letterId,
        updatedAt: matterAiChats.updatedAt,
      })
      .from(matterAiChats)
      .where(
        and(
          ownChat(params.tenantId, params.userId, params.practice),
          params.matterId === undefined
            ? undefined
            : params.matterId
              ? eq(matterAiChats.matterId, params.matterId)
              : isNull(matterAiChats.matterId),
          exists(
            tx
              .select({ id: matterAiChatMessages.id })
              .from(matterAiChatMessages)
              .where(
                and(
                  eq(matterAiChatMessages.chatId, matterAiChats.id),
                  eq(matterAiChatMessages.tenantId, matterAiChats.tenantId)
                )
              )
          )
        )
      )
      .orderBy(desc(matterAiChats.updatedAt));

    return rows
      .map((row) => ({
        id: row.id,
        title: row.title,
        pinned: Boolean(row.pinnedAt),
        matterId: row.matterId,
        letterId: row.letterId,
        updatedAt: row.updatedAt,
      }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  });
}

export async function getOwnChat(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  chatId: string;
}): Promise<ChatDetail | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [chat] = await tx
      .select({
        id: matterAiChats.id,
        title: matterAiChats.title,
        pinnedAt: matterAiChats.pinnedAt,
        matterId: matterAiChats.matterId,
        letterId: matterAiChats.letterId,
        updatedAt: matterAiChats.updatedAt,
      })
      .from(matterAiChats)
      .where(
        ownChat(
          params.tenantId,
          params.userId,
          params.practice,
          params.chatId
        )
      )
      .limit(1);

    if (!chat) return null;

    const rows = await tx
      .select({
        id: matterAiChatMessages.id,
        role: matterAiChatMessages.role,
        content: matterAiChatMessages.content,
        actionId: matterAiChatMessages.actionId,
      })
      .from(matterAiChatMessages)
      .where(
        and(
          eq(matterAiChatMessages.tenantId, params.tenantId),
          eq(matterAiChatMessages.chatId, chat.id)
        )
      )
      .orderBy(asc(matterAiChatMessages.createdAt));

    const messages: ChatMessageRecord[] = [];
    for (const row of rows) {
      const role = asRole(row.role);
      if (!role) continue;
      messages.push({
        id: row.id,
        role,
        content: row.content,
        actionId: row.actionId,
      });
    }

    return {
      id: chat.id,
      title: chat.title,
      pinned: Boolean(chat.pinnedAt),
      matterId: chat.matterId,
      letterId: chat.letterId,
      updatedAt: chat.updatedAt,
      messages,
    };
  });
}

export async function createOwnChat(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  title: string;
  matterId?: string | null;
}): Promise<ChatListItem> {
  const title = params.title.trim() || "Neuer Chat";

  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .insert(matterAiChats)
      .values({
        tenantId: params.tenantId,
        matterId: params.matterId ?? null,
        module: params.practice,
        title,
        createdBy: params.userId,
      })
      .returning({
        id: matterAiChats.id,
        title: matterAiChats.title,
        matterId: matterAiChats.matterId,
        letterId: matterAiChats.letterId,
        updatedAt: matterAiChats.updatedAt,
      });

    if (!row) {
      throw new Error("Chat anlegen fehlgeschlagen.");
    }
    return { ...row, pinned: false };
  });
}

export async function appendOwnChatMessage(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  actionId?: string | null;
}): Promise<ChatMessageRecord | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [chat] = await tx
      .select({ id: matterAiChats.id })
      .from(matterAiChats)
      .where(
        ownChat(
          params.tenantId,
          params.userId,
          params.practice,
          params.chatId
        )
      )
      .limit(1);

    if (!chat) return null;

    const [row] = await tx
      .insert(matterAiChatMessages)
      .values({
        tenantId: params.tenantId,
        chatId: chat.id,
        role: params.role,
        content: params.content,
        actionId: params.actionId ?? null,
      })
      .returning({
        id: matterAiChatMessages.id,
        role: matterAiChatMessages.role,
        content: matterAiChatMessages.content,
        actionId: matterAiChatMessages.actionId,
      });

    if (!row) return null;

    await tx
      .update(matterAiChats)
      .set({ updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(matterAiChats.id, chat.id),
          eq(matterAiChats.tenantId, params.tenantId)
        )
      );

    const role = asRole(row.role) ?? params.role;
    return {
      id: row.id,
      role,
      content: row.content,
      actionId: row.actionId,
    };
  });
}

export async function setOwnChatLetterId(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  chatId: string;
  letterId: string;
}): Promise<boolean> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .update(matterAiChats)
      .set({
        letterId: params.letterId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        ownChat(
          params.tenantId,
          params.userId,
          params.practice,
          params.chatId
        )
      )
      .returning({ id: matterAiChats.id });

    return Boolean(row);
  });
}

export async function setOwnChatPinned(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  chatId: string;
  pinned: boolean;
}): Promise<boolean> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .update(matterAiChats)
      .set({
        pinnedAt: params.pinned ? new Date().toISOString() : null,
      })
      .where(
        ownChat(
          params.tenantId,
          params.userId,
          params.practice,
          params.chatId
        )
      )
      .returning({ id: matterAiChats.id });

    return Boolean(row);
  });
}

export async function deleteOwnChat(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  chatId: string;
}): Promise<boolean> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .delete(matterAiChats)
      .where(
        ownChat(
          params.tenantId,
          params.userId,
          params.practice,
          params.chatId
        )
      )
      .returning({ id: matterAiChats.id });

    return Boolean(row);
  });
}
