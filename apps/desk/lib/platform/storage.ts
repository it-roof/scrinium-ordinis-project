import { asc, count, eq } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { tenants, users, type UserRole } from "@/lib/db/schema";

export type TenantListItem = {
  id: string;
  name: string;
  slug: string;
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
}) {
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
    })
    .returning();

  return tenant;
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
