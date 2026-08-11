import { cache } from "react";
import { eq } from "drizzle-orm";

import { PRODUCT_WORDMARK } from "@/lib/brand";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

export type TenantUiContext = {
  tenantName: string;
  brandLabel: string;
};

/** Tenant-Name + App-Label für Shell (eine Query). */
export const getTenantUiContext = cache(
  async (tenantId: string): Promise<TenantUiContext> => {
    const [row] = await db
      .select({
        name: tenants.name,
        brandName: tenants.brandName,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const custom = row?.brandName?.trim();

    return {
      tenantName: row?.name?.trim() || PRODUCT_WORDMARK,
      brandLabel: custom || PRODUCT_WORDMARK,
    };
  }
);

/** Anzeigename in der App nach Login: Tenant-Brand oder Produktmarke. */
export async function getTenantDisplayBrand(tenantId: string): Promise<string> {
  const ctx = await getTenantUiContext(tenantId);
  return ctx.brandLabel;
}
