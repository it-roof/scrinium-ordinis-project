import { cache } from "react";
import { and, eq } from "drizzle-orm";

import {
  isDeskRoleId,
  resolveEffectiveAllowedFunctions,
  resolveEffectivePractices,
  type DeskRoleId,
} from "@/lib/area/desk-roles";
import {
  normalizeOptionalAllowedFunctions,
  type AreaFunctionId,
} from "@/lib/area/functions";
import { db } from "@/lib/db";
import { tenants, users, type DeskRole } from "@/lib/db/schema";
import {
  ALL_APP_MODULE_IDS,
  normalizeEnabledModules,
  normalizeOptionalAllowedModules,
  type AppModuleId,
} from "@/lib/modules";

export const getTenantEnabledModules = cache(
  async (tenantId: string): Promise<AppModuleId[]> => {
    const [row] = await db
      .select({ enabledModules: tenants.enabledModules })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!row) {
      return [...ALL_APP_MODULE_IDS];
    }

    return normalizeEnabledModules(row.enabledModules);
  }
);

/** Effektive Practices: Tenant ∩ Rollen-Bundle (ohne Rolle: alle Tenant-Module). */
export const getUserEffectiveModules = cache(
  async (userId: string, tenantId: string): Promise<AppModuleId[]> => {
    const tenantModules = await getTenantEnabledModules(tenantId);

    const [row] = await db
      .select({
        allowedModules: users.allowedModules,
        deskRole: users.deskRole,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return tenantModules;
    }

    const afterUserAllowlist = normalizeOptionalAllowedModules(
      row.allowedModules
    );
    const tenantScoped =
      afterUserAllowlist === null
        ? tenantModules
        : tenantModules.filter((id) => afterUserAllowlist.includes(id));

    const deskRole =
      row.deskRole && isDeskRoleId(row.deskRole)
        ? (row.deskRole as DeskRoleId)
        : null;

    return resolveEffectivePractices({
      tenantPractices: tenantScoped,
      deskRole,
    });
  }
);

/** Position aus der DB. */
export const getUserDeskRole = cache(
  async (userId: string, tenantId: string): Promise<DeskRole | null> => {
    const [row] = await db
      .select({ deskRole: users.deskRole })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    return row?.deskRole ?? null;
  }
);

/**
 * Effektive Funktions-Allowlist.
 * Rollen-Bundle ∩ optionale Einzel-Allowlist.
 */
export const getUserAllowedFunctions = cache(
  async (
    userId: string,
    tenantId: string
  ): Promise<AreaFunctionId[] | null> => {
    const [row] = await db
      .select({
        deskRole: users.deskRole,
        allowedFunctions: users.allowedFunctions,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const deskRole =
      row.deskRole && isDeskRoleId(row.deskRole)
        ? (row.deskRole as DeskRoleId)
        : null;

    return resolveEffectiveAllowedFunctions({
      deskRole,
      allowedFunctions: normalizeOptionalAllowedFunctions(row.allowedFunctions),
    });
  }
);
