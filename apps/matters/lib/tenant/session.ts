import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { DeskRole, PlatformRole, UserRole } from "@/lib/db/schema";

export type SessionUser = {
  id: string;
  role: UserRole;
  deskRole: DeskRole | null;
  tenantId: string;
  platformRole: PlatformRole | null;
  name?: string | null;
  email?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.tenantId) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    deskRole: user.deskRole ?? null,
    tenantId: user.tenantId,
    platformRole: user.platformRole ?? null,
    name: user.name,
    email: user.email,
  };
}

export async function requireTenantUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
