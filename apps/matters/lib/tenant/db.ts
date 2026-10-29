import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * Tenant context for Postgres RLS. SET LOCAL — transaction-scoped, pool-safe.
 */
export async function withTenantDb<T>(
  tenantId: string,
  fn: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    return fn(tx);
  });
}
