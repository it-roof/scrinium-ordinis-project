import { and, asc, desc, eq, sql } from "drizzle-orm";

import { clients, letters, matters } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

import type { MatterInput, MatterRecord } from "@/lib/clients/types";

type MatterRow = typeof matters.$inferSelect;

function toMatter(
  row: MatterRow,
  clientName: string,
  letterCount = 0
): MatterRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName,
    title: row.title,
    reference: row.reference,
    notes: row.notes,
    module: row.module,
    letterCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getMatters(
  tenantId: string,
  module?: MatterRecord["module"]
): Promise<MatterRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        matter: matters,
        clientName: clients.name,
        letterCount: sql<number>`cast(count(${letters.id}) as int)`,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .leftJoin(letters, eq(letters.matterId, matters.id))
      .where(
        module
          ? and(eq(matters.tenantId, tenantId), eq(matters.module, module))
          : eq(matters.tenantId, tenantId)
      )
      .groupBy(matters.id, clients.name)
      .orderBy(desc(matters.updatedAt));

    return rows.map((row) =>
      toMatter(row.matter, row.clientName, row.letterCount)
    );
  });
}

export async function getMattersForClient(
  tenantId: string,
  clientId: string
): Promise<MatterRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        matter: matters,
        clientName: clients.name,
        letterCount: sql<number>`cast(count(${letters.id}) as int)`,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .leftJoin(letters, eq(letters.matterId, matters.id))
      .where(
        and(eq(matters.tenantId, tenantId), eq(matters.clientId, clientId))
      )
      .groupBy(matters.id, clients.name)
      .orderBy(desc(matters.updatedAt));

    return rows.map((row) =>
      toMatter(row.matter, row.clientName, row.letterCount)
    );
  });
}

export async function getMatterById(
  tenantId: string,
  id: string
): Promise<MatterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        matter: matters,
        clientName: clients.name,
        letterCount: sql<number>`cast(count(${letters.id}) as int)`,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .leftJoin(letters, eq(letters.matterId, matters.id))
      .where(and(eq(matters.id, id), eq(matters.tenantId, tenantId)))
      .groupBy(matters.id, clients.name)
      .limit(1);

    return row ? toMatter(row.matter, row.clientName, row.letterCount) : null;
  });
}

export async function createMatterRow(
  tenantId: string,
  userId: string,
  input: MatterInput
): Promise<MatterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [client] = await tx
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(
        and(eq(clients.id, input.clientId), eq(clients.tenantId, tenantId))
      )
      .limit(1);

    if (!client) {
      return null;
    }

    const [row] = await tx
      .insert(matters)
      .values({
        tenantId,
        createdBy: userId,
        clientId: input.clientId,
        title: input.title.trim(),
        reference: input.reference.trim(),
        notes: input.notes.trim(),
        module: input.module,
      })
      .returning();

    return toMatter(row, client.name, 0);
  });
}

export async function updateMatterRow(
  tenantId: string,
  id: string,
  input: Omit<MatterInput, "clientId">
): Promise<MatterRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(matters)
      .set({
        title: input.title.trim(),
        reference: input.reference.trim(),
        notes: input.notes.trim(),
        module: input.module,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(matters.id, id), eq(matters.tenantId, tenantId)))
      .returning();

    if (!row) {
      return null;
    }

    const [client] = await tx
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, row.clientId))
      .limit(1);

    return toMatter(row, client?.name ?? "", 0);
  });
}

export async function deleteMatterRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(matters)
      .where(and(eq(matters.id, id), eq(matters.tenantId, tenantId)))
      .returning({ id: matters.id });

    return deleted.length > 0;
  });
}

export async function listMattersOptions(
  tenantId: string,
  module?: MatterRecord["module"]
): Promise<
  {
    id: string;
    title: string;
    clientId: string;
    clientName: string;
    reference: string;
  }[]
> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: matters.id,
        title: matters.title,
        clientId: clients.id,
        clientName: clients.name,
        reference: matters.reference,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .where(
        module
          ? and(eq(matters.tenantId, tenantId), eq(matters.module, module))
          : eq(matters.tenantId, tenantId)
      )
      .orderBy(asc(clients.name), asc(matters.title));

    return rows;
  });
}
