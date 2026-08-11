"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { validatePassword } from "@/lib/auth/password-policy";
import { db } from "@/lib/db";
import { tenants, users, type UserRole } from "@/lib/db/schema";
import {
  createTenantRow,
  createTenantUserRow,
} from "@/lib/platform/storage";
import { requirePlatformAdminAction } from "@/lib/tenant/session";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export async function createTenantAction(input: {
  name: string;
  slug: string;
}) {
  const admin = await requirePlatformAdminAction();
  if (!admin) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  const name = input.name.trim();
  const slug = normalizeSlug(input.slug);

  if (!name) {
    return { success: false as const, error: "Bitte einen Namen angeben." };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      success: false as const,
      error: "Slug: nur Kleinbuchstaben, Zahlen und Bindestriche.",
    };
  }

  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return { success: false as const, error: "Slug ist bereits vergeben." };
  }

  const tenant = await createTenantRow({ name, slug });
  revalidatePath("/platform");

  return { success: true as const, tenant };
}

export async function createTenantUserAction(input: {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
}) {
  const admin = await requirePlatformAdminAction();
  if (!admin) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role === "admin" ? "admin" : "employee";

  if (!email || !name) {
    return { success: false as const, error: "E-Mail und Name sind Pflicht." };
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    return { success: false as const, error: passwordError };
  }

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, input.tenantId))
    .limit(1);

  if (!tenant) {
    return { success: false as const, error: "Tenant nicht gefunden." };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { success: false as const, error: "E-Mail ist bereits vergeben." };
  }

  const user = await createTenantUserRow({
    tenantId: input.tenantId,
    email,
    name,
    password: input.password,
    role,
  });

  revalidatePath("/platform");
  revalidatePath(`/platform/tenants/${input.tenantId}`);

  return { success: true as const, user };
}
