import { and, asc, eq, sql } from "drizzle-orm";

import { clientPersons, clients, matters } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

import type {
  ClientInput,
  ClientKind,
  ClientPersonInput,
  ClientPersonRecord,
  ClientRecord,
} from "./types";
import { resolveClientDisplayName } from "./types";

type ClientRow = typeof clients.$inferSelect;
type PersonRow = typeof clientPersons.$inferSelect;

function toClient(
  row: ClientRow,
  matterCount = 0,
  personCount = 0
): ClientRecord {
  return {
    id: row.id,
    kind: row.kind as ClientKind,
    name: row.name,
    salutation: row.salutation,
    firstName: row.firstName,
    lastName: row.lastName,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    notes: row.notes,
    module: row.module,
    matterCount,
    personCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPerson(row: PersonRow): ClientPersonRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    salutation: row.salutation,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function clientValues(input: ClientInput) {
  const kind = input.kind;
  const displayName = resolveClientDisplayName(input);

  if (kind === "company") {
    return {
      kind,
      name: displayName,
      salutation: "",
      firstName: "",
      lastName: "",
      street: input.street.trim(),
      postalCode: input.postalCode.trim(),
      city: input.city.trim(),
      country: input.country.trim() || "Deutschland",
      email: "",
      phone: "",
      mobile: "",
      notes: input.notes.trim(),
      module: input.module,
    };
  }

  return {
    kind,
    name: displayName,
    salutation: input.salutation.trim(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    street: input.street.trim(),
    postalCode: input.postalCode.trim(),
    city: input.city.trim(),
    country: input.country.trim() || "Deutschland",
    email: input.email.trim(),
    phone: input.phone.trim(),
    mobile: input.mobile.trim(),
    notes: input.notes.trim(),
    module: input.module,
  };
}

export async function getClients(
  tenantId: string,
  module?: ClientRecord["module"]
): Promise<ClientRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        client: clients,
        matterCount: sql<number>`cast(count(distinct ${matters.id}) as int)`,
        personCount: sql<number>`cast(count(distinct ${clientPersons.id}) as int)`,
      })
      .from(clients)
      .leftJoin(matters, eq(matters.clientId, clients.id))
      .leftJoin(clientPersons, eq(clientPersons.clientId, clients.id))
      .where(
        module
          ? and(eq(clients.tenantId, tenantId), eq(clients.module, module))
          : eq(clients.tenantId, tenantId)
      )
      .groupBy(clients.id)
      .orderBy(asc(clients.name));

    return rows.map((row) =>
      toClient(row.client, row.matterCount, row.personCount)
    );
  });
}

export async function getClientById(
  tenantId: string,
  id: string
): Promise<ClientRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        client: clients,
        matterCount: sql<number>`cast(count(distinct ${matters.id}) as int)`,
        personCount: sql<number>`cast(count(distinct ${clientPersons.id}) as int)`,
      })
      .from(clients)
      .leftJoin(matters, eq(matters.clientId, clients.id))
      .leftJoin(clientPersons, eq(clientPersons.clientId, clients.id))
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .groupBy(clients.id)
      .limit(1);

    return row
      ? toClient(row.client, row.matterCount, row.personCount)
      : null;
  });
}

export async function createClientRow(
  tenantId: string,
  userId: string,
  input: ClientInput
): Promise<ClientRecord> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .insert(clients)
      .values({
        tenantId,
        createdBy: userId,
        ...clientValues(input),
      })
      .returning();

    return toClient(row, 0, 0);
  });
}

export async function updateClientRow(
  tenantId: string,
  id: string,
  input: ClientInput
): Promise<ClientRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(clients)
      .set({
        ...clientValues(input),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning();

    return row ? toClient(row) : null;
  });
}

export async function deleteClientRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning({ id: clients.id });

    return deleted.length > 0;
  });
}

export async function getPersonsForClient(
  tenantId: string,
  clientId: string
): Promise<ClientPersonRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(clientPersons)
      .where(
        and(
          eq(clientPersons.tenantId, tenantId),
          eq(clientPersons.clientId, clientId)
        )
      )
      .orderBy(asc(clientPersons.lastName), asc(clientPersons.firstName));

    return rows.map(toPerson);
  });
}

export async function createPersonRow(
  tenantId: string,
  userId: string,
  input: ClientPersonInput
): Promise<ClientPersonRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [client] = await tx
      .select({ id: clients.id, kind: clients.kind })
      .from(clients)
      .where(
        and(eq(clients.id, input.clientId), eq(clients.tenantId, tenantId))
      )
      .limit(1);
    if (!client || client.kind !== "company") {
      return null;
    }

    const [row] = await tx
      .insert(clientPersons)
      .values({
        tenantId,
        createdBy: userId,
        clientId: input.clientId,
        salutation: input.salutation.trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role.trim(),
        street: input.street.trim(),
        postalCode: input.postalCode.trim(),
        city: input.city.trim(),
        country: input.country.trim() || "Deutschland",
        email: input.email.trim(),
        phone: input.phone.trim(),
        mobile: input.mobile.trim(),
        notes: input.notes.trim(),
      })
      .returning();

    return toPerson(row);
  });
}

export async function updatePersonRow(
  tenantId: string,
  id: string,
  input: Omit<ClientPersonInput, "clientId">
): Promise<ClientPersonRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .update(clientPersons)
      .set({
        salutation: input.salutation.trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role.trim(),
        street: input.street.trim(),
        postalCode: input.postalCode.trim(),
        city: input.city.trim(),
        country: input.country.trim() || "Deutschland",
        email: input.email.trim(),
        phone: input.phone.trim(),
        mobile: input.mobile.trim(),
        notes: input.notes.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(clientPersons.id, id), eq(clientPersons.tenantId, tenantId)))
      .returning();

    return row ? toPerson(row) : null;
  });
}

export async function deletePersonRow(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(clientPersons)
      .where(and(eq(clientPersons.id, id), eq(clientPersons.tenantId, tenantId)))
      .returning({ id: clientPersons.id });

    return deleted.length > 0;
  });
}

export async function getPersonById(
  tenantId: string,
  id: string
): Promise<ClientPersonRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(clientPersons)
      .where(and(eq(clientPersons.id, id), eq(clientPersons.tenantId, tenantId)))
      .limit(1);

    return row ? toPerson(row) : null;
  });
}
