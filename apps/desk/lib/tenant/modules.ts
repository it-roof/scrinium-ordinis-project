import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { resolveEffectiveAllowedFunctions } from "@/lib/area/desk-roles";
import {
  normalizeOptionalAllowedFunctions,
  type AreaFunctionId,
} from "@/lib/area/functions";
import { db } from "@/lib/db";
import { tenants, users, type DeskRole } from "@/lib/db/schema";
import {
  ALL_APP_MODULE_IDS,
  intersectModules,
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

/** Effektive Module für einen User: Tenant ∩ optionaler User-Allowlist. */
export const getUserEffectiveModules = cache(
  async (userId: string, tenantId: string): Promise<AppModuleId[]> => {
    const tenantModules = await getTenantEnabledModules(tenantId);

    const [row] = await db
      .select({ allowedModules: users.allowedModules })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return tenantModules;
    }

    return intersectModules(
      tenantModules,
      normalizeOptionalAllowedModules(row.allowedModules)
    );
  }
);

/** Position (Rechtsanwalt / Sekretariat) aus der DB. */
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
 * Effektive Funktions-Allowlist des Users.
 * Position (Rechtsanwalt/Sekretariat) ∩ optionale Einzel-Allowlist.
 * null = alle Funktionen der freigeschalteten Bereiche.
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

    return resolveEffectiveAllowedFunctions({
      deskRole: row.deskRole,
      allowedFunctions: normalizeOptionalAllowedFunctions(row.allowedFunctions),
    });
  }
);
