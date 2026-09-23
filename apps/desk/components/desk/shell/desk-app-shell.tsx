import type { CSSProperties, ReactNode } from "react";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AlbaShell } from "@/components/neues-design/alba-shell";
import {
  ACTIVE_AREA_COOKIE,
  firstAvailableArea,
  parseActiveArea,
} from "@/lib/area/active-area";
import type { DeskRoleId } from "@/lib/area/desk-roles";
import { DESK_ROLE_LABELS, isDeskRoleId } from "@/lib/area/desk-roles";
import type { AreaFunctionId } from "@/lib/area/functions";
import {
  practiceFromSlug,
  slugForPractice,
} from "@/lib/area/paths";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { AppModuleId } from "@/lib/modules";
import { getTenantUiContext } from "@/lib/tenant/brand";
import {
  getUserAllowedFunctions,
  getUserDeskRole,
  getUserEffectiveModules,
} from "@/lib/tenant/modules";
import { formatUserName } from "@/lib/users/names";

import "@/app/neues-design/brand-lab.css";

export type DeskSessionContext = {
  userId: string;
  tenantId: string;
  area: AppModuleId;
  deskRole: DeskRoleId;
  allowedFunctions: AreaFunctionId[] | null;
  displayName: string;
  email: string;
  brandLabel: string;
  tenantName: string;
};

/** @deprecated Nutze DeskSessionContext */
export type V1SessionContext = DeskSessionContext;

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

/** @deprecated Nutze requireDeskUser */
export async function requireV1Rechtsanwalt(options?: {
  requireFunction?: AreaFunctionId;
}): Promise<DeskSessionContext> {
  return requireDeskUser(options);
}

/** @deprecated Nutze requireDeskUser */
export async function requireV1DeskUser(options?: {
  requireFunction?: AreaFunctionId;
}): Promise<DeskSessionContext> {
  return requireDeskUser(options);
}

export async function requireDeskUser(options?: {
  requireFunction?: AreaFunctionId;
}): Promise<DeskSessionContext> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [deskRole, tenantUi, nameRow, allowedFunctions, modules] =
    await Promise.all([
      getUserDeskRole(session.user.id, session.user.tenantId),
      getTenantUiContext(session.user.tenantId),
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
    redirect("/dashboard");
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
    brandLabel: tenantUi.brandLabel,
    tenantName: tenantUi.tenantName,
  };
}

/**
 * Wie requireDeskUser, aber Practice kommt aus der URL (`/r/...`).
 * Cookie-Fallback entfällt für den Daten-Scope.
 */
export async function requireDeskPractice(
  practiceSlug: string,
  options?: { requireFunction?: AreaFunctionId }
): Promise<DeskSessionContext> {
  const ctx = await requireDeskUser(options);
  const practice = practiceFromSlug(practiceSlug);
  if (!practice) {
    notFound();
  }

  const modules = await getUserEffectiveModules(ctx.userId, ctx.tenantId);
  if (!modules.includes(practice)) {
    redirect("/dashboard");
  }

  const canonical = slugForPractice(practice);
  if (practiceSlug !== canonical) {
    notFound();
  }

  return { ...ctx, area: practice };
}

type DeskAppShellProps = {
  ctx: DeskSessionContext;
  children: ReactNode;
  headerTitle?: string;
};

export async function DeskAppShell({
  ctx,
  children,
  headerTitle: _headerTitle = "Übersicht",
}: DeskAppShellProps) {
  void _headerTitle;

  return (
    <div
      style={
        {
          "--font-alba-manrope": "var(--font-manrope)",
          "--radius": "0.25rem",
        } as CSSProperties
      }
    >
      <AlbaShell
        fillMain
        tenantName={ctx.tenantName}
        allowedFunctions={ctx.allowedFunctions}
        user={{
          name: ctx.displayName,
          roleLabel: DESK_ROLE_LABELS[ctx.deskRole],
          email: ctx.email,
        }}
      >
        <div className="v1-fade flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </AlbaShell>
    </div>
  );
}

/** @deprecated Nutze DeskAppShell */
export const V1AppShell = DeskAppShell;
