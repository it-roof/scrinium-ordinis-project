import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * Führt Arbeit in einer Transaktion aus und setzt den Tenant-Kontext für Postgres RLS.
 * `set_config(..., true)` = SET LOCAL — gilt nur innerhalb der Transaktion (Pool-sicher).
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

/**
 * Wie withTenantDb, zusätzlich Owner-Kontext für user-private Tabellen (RLS).
 */
export async function withTenantUserDb<T>(
  tenantId: string,
  userId: string,
  fn: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    await tx.execute(
      sql`select set_config('app.current_user_id', ${userId}, true)`
    );
    return fn(tx);
  });
}
