import type { CSSProperties, ReactNode } from "react";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/v1/dashboard/app-sidebar";
import { SiteHeader } from "@/components/v1/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/v1/ui/sidebar";
import {
  ACTIVE_AREA_COOKIE,
  firstAvailableArea,
  parseActiveArea,
} from "@/lib/area/active-area";
import type { DeskRoleId } from "@/lib/area/desk-roles";
import { DESK_ROLE_LABELS, isDeskRoleId } from "@/lib/area/desk-roles";
import type { AreaFunctionId } from "@/lib/area/functions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkDatabaseConnection } from "@/lib/db/health";
import { users } from "@/lib/db/schema";
import type { AppModuleId } from "@/lib/modules";
import { getTenantDisplayBrand } from "@/lib/tenant/brand";
import {
  getUserAllowedFunctions,
  getUserDeskRole,
  getUserEffectiveModules,
} from "@/lib/tenant/modules";
import { formatUserName } from "@/lib/users/names";

export type V1SessionContext = {
  userId: string;
  tenantId: string;
  area: AppModuleId;
  deskRole: DeskRoleId;
  allowedFunctions: AreaFunctionId[] | null;
  displayName: string;
  email: string;
  brandLabel: string;
};

function resolveArea(
  rawCookie: string | undefined,
  modules: AppModuleId[]
): AppModuleId {
  const parsed = parseActiveArea(rawCookie, modules);
  if (parsed !== "all") {
    return parsed;
  }
  return firstAvailableArea(modules) ?? "legal";
}

/** @deprecated Nutze requireV1DeskUser — Alias für bestehende Imports. */
export async function requireV1Rechtsanwalt(options?: {
  requireFunction?: AreaFunctionId;
}): Promise<V1SessionContext> {
  return requireV1DeskUser(options);
}

export async function requireV1DeskUser(options?: {
  requireFunction?: AreaFunctionId;
}): Promise<V1SessionContext> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [deskRole, brandLabel, nameRow, allowedFunctions, modules] =
    await Promise.all([
      getUserDeskRole(session.user.id, session.user.tenantId),
      getTenantDisplayBrand(session.user.tenantId),
      db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(
          and(
            eq(users.id, session.user.id),
            eq(users.tenantId, session.user.tenantId)
          )
        )
        .limit(1),
      getUserAllowedFunctions(session.user.id, session.user.tenantId),
      getUserEffectiveModules(session.user.id, session.user.tenantId),
    ]);

  if (!deskRole || !isDeskRoleId(deskRole)) {
    redirect("/");
  }

  if (
    options?.requireFunction &&
    allowedFunctions !== null &&
    !allowedFunctions.includes(options.requireFunction)
  ) {
    redirect("/v1/dashboard");
  }

  const cookieStore = await cookies();
  const area = resolveArea(
    cookieStore.get(ACTIVE_AREA_COOKIE)?.value,
    modules
  );

  const profile = nameRow[0];
  const displayName = profile
    ? formatUserName({
        firstName: profile.firstName,
        lastName: profile.lastName,
      }) || profile.name
    : session.user.name || "Benutzer";

  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    area,
    deskRole,
    allowedFunctions,
    displayName,
    email: profile?.email ?? session.user.email ?? "",
    brandLabel,
  };
}

type V1AppShellProps = {
  ctx: V1SessionContext;
  children: ReactNode;
  headerTitle?: string;
};

export async function V1AppShell({
  ctx,
  children,
  headerTitle = "Übersicht",
}: V1AppShellProps) {
  const dbConnected = await checkDatabaseConnection();

  return (
    <SidebarProvider
      className="h-full min-h-0"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        brandLabel={ctx.brandLabel}
        area={ctx.area}
        deskRole={ctx.deskRole}
        allowedFunctions={ctx.allowedFunctions}
        user={{
          name: ctx.displayName,
          email: ctx.email,
        }}
      />
      <SidebarInset className="min-h-0 overflow-hidden">
        <SiteHeader
          title={headerTitle}
          roleLabel={DESK_ROLE_LABELS[ctx.deskRole]}
          dbConnected={dbConnected}
        />
        <div className="v1-fade flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
