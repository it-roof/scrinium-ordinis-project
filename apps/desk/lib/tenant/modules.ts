import { cache } from "react";
import { and, eq } from "drizzle-orm";

import {
  normalizeOptionalAllowedFunctions,
  type AreaFunctionId,
} from "@/lib/area/functions";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
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

/**
 * Optionale Funktions-Allowlist des Users.
 * null = alle Funktionen der freigeschalteten Bereiche.
 */
export const getUserAllowedFunctions = cache(
  async (
    userId: string,
    tenantId: string
  ): Promise<AreaFunctionId[] | null> => {
    const [row] = await db
      .select({ allowedFunctions: users.allowedFunctions })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return null;
    }

    return normalizeOptionalAllowedFunctions(row.allowedFunctions);
  }
);
