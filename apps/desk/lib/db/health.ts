import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";

const PING_TIMEOUT_MS = 2500;

/**
 * Kurzer Verbindungscheck für UI-Status (Sidebar).
 * Wirft nicht — liefert nur ok/fail.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const ping = getDb().execute(sql`select 1`);
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("db ping timeout")), PING_TIMEOUT_MS);
    });

    await Promise.race([ping, timeout]);
    return true;
  } catch {
    return false;
  }
}
