import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import {
  ALL_APP_MODULE_IDS,
  normalizeEnabledModules,
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
