import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { PlatformRole, UserRole } from "@/lib/db/schema";

export type SessionUser = {
  id: string;
  role: UserRole;
  tenantId: string;
  platformRole: PlatformRole | null;
  name?: string | null;
  email?: string | null;
};

export function isPlatformSuperAdmin(
  user: { platformRole?: PlatformRole | null } | null | undefined
): boolean {
  return user?.platformRole === "super_admin";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.tenantId) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    tenantId: user.tenantId,
    platformRole: user.platformRole ?? null,
    name: user.name,
    email: user.email,
  };
}

/** Für Server Actions: null bei fehlender Session. */
export async function requireSessionUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Für Server Components: Redirect zum Login. */
export async function requireTenantUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/** Plattform-Super-Admin — nur Tenant-/User-Verwaltung. */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireTenantUser();

  if (!isPlatformSuperAdmin(user)) {
    redirect("/");
  }

  return user;
}

export async function requirePlatformAdminAction(): Promise<SessionUser | null> {
  const user = await getSessionUser();

  if (!user || !isPlatformSuperAdmin(user)) {
    return null;
  }

  return user;
}
