import { and, asc, desc, eq, isNull } from "drizzle-orm";

import {
  matterAiChatMessages,
  matterAiChats,
  matters,
} from "@/lib/db/schema";
import type { PracticeId } from "@/lib/modules";
import { withTenantDb } from "@/lib/tenant/db";

export type MatterAiChatListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type MatterAiChatMessageRecord = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actionId: string | null;
  createdAt: string;
};

export type MatterAiChatDetail = MatterAiChatListItem & {
  matterId: string | null;
  letterId: string | null;
  module: PracticeId;
  messages: MatterAiChatMessageRecord[];
};

function asMessageRole(
  role: string
): MatterAiChatMessageRecord["role"] | null {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  return null;
}

export async function listMatterAiChats(
  tenantId: string,
  matterId: string | null,
  module: PracticeId
): Promise<MatterAiChatListItem[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: matterAiChats.id,
        title: matterAiChats.title,
        createdAt: matterAiChats.createdAt,
        updatedAt: matterAiChats.updatedAt,
      })
      .from(matterAiChats)
      .where(
        and(
          eq(matterAiChats.tenantId, tenantId),
          matterId == null
            ? isNull(matterAiChats.matterId)
            : eq(matterAiChats.matterId, matterId),
          eq(matterAiChats.module, module)
        )
      )
      .orderBy(desc(matterAiChats.updatedAt));

    return rows;
  });
}

/** Neuester Chat der Practice (mit oder ohne Akte). */
export async function getLatestMatterAiChat(
  tenantId: string,
  module: PracticeId
): Promise<{ id: string; matterId: string | null } | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: matterAiChats.id,
        matterId: matterAiChats.matterId,
      })
      .from(matterAiChats)
      .where(
        and(
          eq(matterAiChats.tenantId, tenantId),
          eq(matterAiChats.module, module)
        )
      )
      .orderBy(desc(matterAiChats.updatedAt))
      .limit(1);

    return row ?? null;
  });
}

export async function createMatterAiChat(params: {
  tenantId: string;
  userId: string;
  matterId: string | null;
  module: PracticeId;
  title?: string;
}): Promise<MatterAiChatListItem | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    if (params.matterId != null) {
      const [matter] = await tx
        .select({ id: matters.id, module: matters.module })
        .from(matters)
        .where(
          and(
            eq(matters.id, params.matterId),
            eq(matters.tenantId, params.tenantId),
            eq(matters.module, params.module)
          )
        )
        .limit(1);

      if (!matter) return null;
    }

    const title = (params.title ?? "").trim() || "Neuer Chat";
    const [row] = await tx
      .insert(matterAiChats)
      .values({
        tenantId: params.tenantId,
        matterId: params.matterId,
        module: params.module,
        title,
        createdBy: params.userId,
      })
      .returning({
        id: matterAiChats.id,
        title: matterAiChats.title,
        createdAt: matterAiChats.createdAt,
        updatedAt: matterAiChats.updatedAt,
      });

    return row ?? null;
  });
}

export async function getMatterAiChatDetail(params: {
  tenantId: string;
  chatId: string;
  module: PracticeId;
}): Promise<MatterAiChatDetail | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [chat] = await tx
      .select()
      .from(matterAiChats)
      .where(
        and(
          eq(matterAiChats.id, params.chatId),
          eq(matterAiChats.tenantId, params.tenantId),
          eq(matterAiChats.module, params.module)
        )
      )
      .limit(1);

    if (!chat) return null;

    const messageRows = await tx
      .select()
      .from(matterAiChatMessages)
      .where(
        and(
          eq(matterAiChatMessages.tenantId, params.tenantId),
          eq(matterAiChatMessages.chatId, chat.id)
        )
      )
      .orderBy(asc(matterAiChatMessages.createdAt));

    const messages: MatterAiChatMessageRecord[] = [];
    for (const row of messageRows) {
      const role = asMessageRole(row.role);
      if (!role) continue;
      messages.push({
        id: row.id,
        role,
        content: row.content,
        actionId: row.actionId,
        createdAt: row.createdAt,
      });
    }

    return {
      id: chat.id,
      title: chat.title,
      matterId: chat.matterId,
      letterId: chat.letterId,
      module: chat.module as PracticeId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages,
    };
  });
}

export async function appendMatterAiChatMessages(params: {
  tenantId: string;
  chatId: string;
  module: PracticeId;
  messages: Array<{
    role: MatterAiChatMessageRecord["role"];
    content: string;
    actionId?: string | null;
  }>;
}): Promise<MatterAiChatMessageRecord[] | null> {
  if (params.messages.length === 0) return [];

  return withTenantDb(params.tenantId, async (tx) => {
    const [chat] = await tx
      .select({ id: matterAiChats.id })
      .from(matterAiChats)
      .where(
        and(
          eq(matterAiChats.id, params.chatId),
          eq(matterAiChats.tenantId, params.tenantId),
          eq(matterAiChats.module, params.module)
        )
      )
      .limit(1);

    if (!chat) return null;

    const inserted = await tx
      .insert(matterAiChatMessages)
      .values(
        params.messages.map((msg) => ({
          tenantId: params.tenantId,
          chatId: chat.id,
          role: msg.role,
          content: msg.content,
          actionId: msg.actionId ?? null,
        }))
      )
      .returning();

    const now = new Date().toISOString();
    await tx
      .update(matterAiChats)
      .set({ updatedAt: now })
      .where(
        and(
          eq(matterAiChats.id, chat.id),
          eq(matterAiChats.tenantId, params.tenantId)
        )
      );

    return inserted.map((row) => {
      const role = asMessageRole(row.role) ?? "assistant";
      return {
        id: row.id,
        role,
        content: row.content,
        actionId: row.actionId,
        createdAt: row.createdAt,
      };
    });
  });
}

/** Akte an einen bisher unzugeordneten Chat binden (einmalig). */
export async function assignMatterAiChat(params: {
  tenantId: string;
  chatId: string;
  module: PracticeId;
  matterId: string;
}): Promise<{ id: string; matterId: string } | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [matter] = await tx
      .select({ id: matters.id })
      .from(matters)
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId),
          eq(matters.module, params.module)
        )
      )
      .limit(1);

    if (!matter) return null;

    const [row] = await tx
      .update(matterAiChats)
      .set({
        matterId: params.matterId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(matterAiChats.id, params.chatId),
          eq(matterAiChats.tenantId, params.tenantId),
          eq(matterAiChats.module, params.module),
          isNull(matterAiChats.matterId)
        )
      )
      .returning({
        id: matterAiChats.id,
        matterId: matterAiChats.matterId,
      });

    if (!row?.matterId) return null;
    return { id: row.id, matterId: row.matterId };
  });
}

export async function renameMatterAiChat(params: {
  tenantId: string;
  chatId: string;
  module: PracticeId;
  title: string;
}): Promise<boolean> {
  const title = params.title.trim().slice(0, 200);
  if (!title) return false;

  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .update(matterAiChats)
      .set({ title, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(matterAiChats.id, params.chatId),
          eq(matterAiChats.tenantId, params.tenantId),
          eq(matterAiChats.module, params.module)
        )
      )
      .returning({ id: matterAiChats.id });

    return Boolean(row);
  });
}

export async function deleteMatterAiChat(params: {
  tenantId: string;
  chatId: string;
  module: PracticeId;
}): Promise<boolean> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .delete(matterAiChats)
      .where(
        and(
          eq(matterAiChats.id, params.chatId),
          eq(matterAiChats.tenantId, params.tenantId),
          eq(matterAiChats.module, params.module)
        )
      )
      .returning({ id: matterAiChats.id });

    return Boolean(row);
  });
}

export async function setMatterAiChatLetterId(params: {
  tenantId: string;
  chatId: string;
  module: PracticeId;
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
        and(
          eq(matterAiChats.id, params.chatId),
          eq(matterAiChats.tenantId, params.tenantId),
          eq(matterAiChats.module, params.module)
        )
      )
      .returning({ id: matterAiChats.id });

    return Boolean(row);
  });
}
