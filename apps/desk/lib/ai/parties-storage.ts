import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  matterParties,
  type MatterParty,
  type MatterPartyRole,
} from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type MatterPartyInput = {
  role: MatterPartyRole;
  kind: "company" | "person";
  name: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  postalCode?: string;
  city?: string;
};

export type MatterPartyRecord = {
  id: string;
  matterId: string;
  role: MatterPartyRole;
  kind: "company" | "person";
  name: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  createdAt: string;
  updatedAt: string;
};

function toRecord(row: MatterParty): MatterPartyRecord {
  return {
    id: row.id,
    matterId: row.matterId,
    role: row.role,
    kind: row.kind,
    name: row.name,
    firstName: row.firstName,
    lastName: row.lastName,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function displayName(input: MatterPartyInput): string {
  if (input.kind === "person") {
    const full = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
    return full || input.name.trim();
  }
  return input.name.trim();
}

export async function listMatterParties(
  tenantId: string,
  matterId: string
): Promise<MatterPartyRecord[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(matterParties)
      .where(
        and(
          eq(matterParties.tenantId, tenantId),
          eq(matterParties.matterId, matterId)
        )
      )
      .orderBy(asc(matterParties.createdAt));
    return rows.map(toRecord);
  });
}

export async function createMatterParty(
  tenantId: string,
  matterId: string,
  input: MatterPartyInput
): Promise<MatterPartyRecord | null> {
  const name = displayName(input);
  if (!name) return null;
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .insert(matterParties)
      .values({
        tenantId,
        matterId,
        role: input.role,
        kind: input.kind,
        name,
        firstName: input.firstName?.trim() ?? "",
        lastName: input.lastName?.trim() ?? "",
        street: input.street?.trim() ?? "",
        postalCode: input.postalCode?.trim() ?? "",
        city: input.city?.trim() ?? "",
      })
      .returning();
    return row ? toRecord(row) : null;
  });
}

export async function deleteMatterParty(
  tenantId: string,
  partyId: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const deleted = await tx
      .delete(matterParties)
      .where(
        and(
          eq(matterParties.tenantId, tenantId),
          eq(matterParties.id, partyId)
        )
      )
      .returning({ id: matterParties.id });
    return deleted.length > 0;
  });
}
