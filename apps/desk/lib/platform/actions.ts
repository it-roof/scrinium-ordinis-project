"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { validatePassword } from "@/lib/auth/password-policy";
import { revokeAllUserSessions } from "@/lib/auth/sessions";
import { db } from "@/lib/db";
import { tenants, users, type UserRole } from "@/lib/db/schema";
import {
  createTenantRow,
  createTenantUserRow,
  deleteTenantRow,
  deleteTenantUserRow,
  updateTenantRow,
  updateTenantUserRow,
} from "@/lib/platform/storage";
import {
  normalizeHostname,
  validateCustomDomain,
} from "@/lib/tenant/domain";
import { requirePlatformAdminAction } from "@/lib/tenant/session";
import {
  intersectModules,
  normalizeEnabledModules,
  normalizeOptionalAllowedModules,
  type AppModuleId,
} from "@/lib/modules";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

async function resolveUserAllowedModules(
  tenantId: string,
  input: unknown
): Promise<AppModuleId[] | null> {
  const requested = normalizeOptionalAllowedModules(input);
  if (requested === null) {
    return null;
  }

  const [tenant] = await db
    .select({ enabledModules: tenants.enabledModules })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantModules = normalizeEnabledModules(tenant?.enabledModules);
  return intersectModules(tenantModules, requested);
}

function normalizeBrandName(value: string | undefined) {
  return value?.trim() || null;
}

function normalizeCustomDomainInput(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) {
    return { domain: null as string | null, error: null as string | null };
  }

  const error = validateCustomDomain(raw);
  if (error) {
    return { domain: null, error };
  }

  return { domain: normalizeHostname(raw), error: null };
}

function validateTenantFields(name: string, slug: string) {
  if (!name) {
    return "Bitte einen Namen angeben.";
  }

  if (!SLUG_PATTERN.test(slug)) {
    return "Slug: nur Kleinbuchstaben, Zahlen und Bindestriche.";
  }

  return null;
}

export async function createTenantAction(input: {
  name: string;
  slug: string;
  brandName?: string;
  customDomain?: string;
  enabledModules?: AppModuleId[];
}) {
  const admin = await requirePlatformAdminAction();
  if (!admin) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  const name = input.name.trim();
  const slug = normalizeSlug(input.slug);
  const brandName = normalizeBrandName(input.brandName);
  const enabledModules = normalizeEnabledModules(input.enabledModules);
  const { domain: customDomain, error: domainError } =
    normalizeCustomDomainInput(input.customDomain);
  const fieldError = validateTenantFields(name, slug);

  if (fieldError) {
    return { success: false as const, error: fieldError };
  }

  if (domainError) {
    return { success: false as const, error: domainError };
  }

  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return { success: false as const, error: "Slug ist bereits vergeben." };
  }

  if (customDomain) {
    const [domainTaken] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.customDomain, customDomain))
      .limit(1);

    if (domainTaken) {
      return { success: false as const, error: "Domain ist bereits vergeben." };
    }
  }

  const tenant = await createTenantRow({
    name,
    slug,
    brandName,
    customDomain,
    enabledModules,
  });
  revalidatePath("/platform");

  return { success: true as const, tenant };
}

export async function updateTenantAction(input: {
  id: string;
  name: string;
  slug: string;
  brandName?: string;
  customDomain?: string;
  enabledModules?: AppModuleId[];
}) {
  const admin = await requirePlatformAdminAction();
  if (!admin) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  const name = input.name.trim();
  const slug = normalizeSlug(input.slug);
  const brandName = normalizeBrandName(input.brandName);
  const enabledModules = normalizeEnabledModules(input.enabledModules);
  const { domain: customDomain, error: domainError } =
    normalizeCustomDomainInput(input.customDomain);
  const fieldError = validateTenantFields(name, slug);

  if (fieldError) {
    return { success: false as const, error: fieldError };
  }

  if (domainError) {
    return { success: false as const, error: domainError };
  }

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, input.id))
    .limit(1);

  if (!tenant) {
    return { success: false as const, error: "Tenant nicht gefunden." };
  }

  const [slugTaken] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (slugTaken && slugTaken.id !== input.id) {
    return { success: false as const, error: "Slug ist bereits vergeben." };
  }

  if (customDomain) {
    const [domainTaken] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.customDomain, customDomain))
      .limit(1);

    if (domainTaken && domainTaken.id !== input.id) {
      return { success: false as const, error: "Domain ist bereits vergeben." };
    }
  }

  const updated = await updateTenantRow({
    id: input.id,
    name,
    slug,
    brandName,
    customDomain,
    enabledModules,
  });
  if (!updated) {
    return { success: false as const, error: "Speichern fehlgeschlagen." };
  }

  revalidatePath("/platform");
  revalidatePath(`/platform/tenants/${input.id}`);
  revalidatePath("/");

  return { success: true as const, tenant: updated };
}

export async function deleteTenantAction(input: { id: string }) {
  const admin = await requirePlatformAdminAction();
  if (!admin) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  if (admin.tenantId === input.id) {
    return {
      success: false as const,
      error: "Den eigenen Home-Tenant kannst du nicht löschen.",
    };
  }

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, input.id))
    .limit(1);

  if (!tenant) {
    return { success: false as const, error: "Tenant nicht gefunden." };
  }

  const deleted = await deleteTenantRow(input.id);
  if (!deleted) {
    return { success: false as const, error: "Löschen fehlgeschlagen." };
  }

  revalidatePath("/platform");

  return { success: true as const };
}

export async function createTenantUserAction(input: {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  allowedModules?: AppModuleId[] | null;
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

  const allowedModules = await resolveUserAllowedModules(
    input.tenantId,
    input.allowedModules
  );

  const user = await createTenantUserRow({
    tenantId: input.tenantId,
    email,
    name,
    password: input.password,
    role,
    allowedModules,
  });

  revalidatePath("/platform");
  revalidatePath(`/platform/tenants/${input.tenantId}`);

  return { success: true as const, user };
}

export async function updateTenantUserAction(input: {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  allowedModules?: AppModuleId[] | null;
  password?: string;
}) {
  const admin = await requirePlatformAdminAction();
  if (!admin) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role === "admin" ? "admin" : "employee";
  const password = input.password?.trim() ?? "";

  if (!email || !name) {
    return { success: false as const, error: "E-Mail und Name sind Pflicht." };
  }

  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return { success: false as const, error: passwordError };
    }
  }

  const [existing] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      platformRole: users.platformRole,
    })
    .from(users)
    .where(eq(users.id, input.id))
    .limit(1);

  if (!existing || existing.tenantId !== input.tenantId) {
    return { success: false as const, error: "Benutzer nicht gefunden." };
  }

  const [emailTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (emailTaken && emailTaken.id !== input.id) {
    return { success: false as const, error: "E-Mail ist bereits vergeben." };
  }

  const allowedModules = await resolveUserAllowedModules(
    input.tenantId,
    input.allowedModules
  );

  const updated = await updateTenantUserRow({
    id: input.id,
    tenantId: input.tenantId,
    email,
    name,
    role,
    allowedModules,
    password: password || undefined,
  });

  if (!updated) {
    return { success: false as const, error: "Speichern fehlgeschlagen." };
  }

  if (password) {
    await revokeAllUserSessions(input.id);
  }

  revalidatePath("/platform");
  revalidatePath(`/platform/tenants/${input.tenantId}`);

  return { success: true as const, user: updated };
}

export async function deleteTenantUserAction(input: {
  id: string;
  tenantId: string;
}) {
  const admin = await requirePlatformAdminAction();
  if (!admin) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  if (admin.id === input.id) {
    return {
      success: false as const,
      error: "Du kannst deinen eigenen Account nicht löschen.",
    };
  }

  const [existing] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
    })
    .from(users)
    .where(eq(users.id, input.id))
    .limit(1);

  if (!existing || existing.tenantId !== input.tenantId) {
    return { success: false as const, error: "Benutzer nicht gefunden." };
  }

  const deleted = await deleteTenantUserRow({
    id: input.id,
    tenantId: input.tenantId,
  });

  if (!deleted) {
    return { success: false as const, error: "Löschen fehlgeschlagen." };
  }

  revalidatePath("/platform");
  revalidatePath(`/platform/tenants/${input.tenantId}`);

  return { success: true as const };
}
