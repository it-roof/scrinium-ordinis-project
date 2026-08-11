import { asc, and, count, eq } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { tenants, users, type UserRole } from "@/lib/db/schema";
import {
  ALL_APP_MODULE_IDS,
  normalizeEnabledModules,
  type AppModuleId,
} from "@/lib/modules";

export type TenantListItem = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  createdAt: string;
  userCount: number;
};

export type TenantUserItem = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  platformRole: string | null;
  createdAt: string;
};

export async function listTenantsWithUserCounts(): Promise<TenantListItem[]> {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      customDomain: tenants.customDomain,
      createdAt: tenants.createdAt,
      userCount: count(users.id),
    })
    .from(tenants)
    .leftJoin(users, eq(users.tenantId, tenants.id))
    .groupBy(tenants.id)
    .orderBy(asc(tenants.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    customDomain: row.customDomain,
    createdAt: row.createdAt,
    userCount: Number(row.userCount),
  }));
}

export async function getTenantById(id: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  return tenant ?? null;
}

export async function createTenantRow(input: {
  name: string;
  slug: string;
  brandName?: string | null;
  customDomain?: string | null;
  enabledModules?: AppModuleId[];
}) {
  const brandName = input.brandName?.trim() || null;
  const customDomain = input.customDomain?.trim().toLowerCase() || null;
  const enabledModules = normalizeEnabledModules(
    input.enabledModules ?? ALL_APP_MODULE_IDS
  );

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      brandName,
      customDomain,
      enabledModules,
    })
    .returning();

  return tenant;
}

export async function updateTenantRow(input: {
  id: string;
  name: string;
  slug: string;
  brandName?: string | null;
  customDomain?: string | null;
  enabledModules?: AppModuleId[];
}) {
  const brandName = input.brandName?.trim() || null;
  const customDomain = input.customDomain?.trim().toLowerCase() || null;
  const enabledModules = normalizeEnabledModules(
    input.enabledModules ?? ALL_APP_MODULE_IDS
  );

  const [tenant] = await db
    .update(tenants)
    .set({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      brandName,
      customDomain,
      enabledModules,
    })
    .where(eq(tenants.id, input.id))
    .returning();

  return tenant ?? null;
}

/**
 * Users haben onDelete:restrict auf tenants — zuerst User löschen,
 * dann Tenant (Fachdaten cascade).
 */
export async function deleteTenantRow(id: string) {
  return db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.tenantId, id));
    const [deleted] = await tx
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id });
    return deleted ?? null;
  });
}

export async function listUsersForTenant(
  tenantId: string
): Promise<TenantUserItem[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      platformRole: users.platformRole,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .orderBy(asc(users.name));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    platformRole: row.platformRole,
    createdAt: row.createdAt,
  }));
}

export async function createTenantUserRow(input: {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      tenantId: input.tenantId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash,
      role: input.role,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  return user;
}

export async function updateTenantUserRow(input: {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}) {
  const values: {
    email: string;
    name: string;
    role: UserRole;
    passwordHash?: string;
  } = {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
  };

  if (input.password) {
    values.passwordHash = await hashPassword(input.password);
  }

  const [user] = await db
    .update(users)
    .set(values)
    .where(and(eq(users.id, input.id), eq(users.tenantId, input.tenantId)))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      tenantId: users.tenantId,
    });

  return user ?? null;
}

export async function deleteTenantUserRow(input: {
  id: string;
  tenantId: string;
}) {
  const [deleted] = await db
    .delete(users)
    .where(and(eq(users.id, input.id), eq(users.tenantId, input.tenantId)))
    .returning({ id: users.id });

  return deleted ?? null;
}
