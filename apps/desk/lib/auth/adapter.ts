import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "next-auth/adapters";

import { getDb } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

function createAuthAdapter(): Adapter {
  return DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter;
}

let cachedAdapter: Adapter | undefined;

/**
 * Lazy Adapter: DrizzleAdapter braucht die echte DB-Instanz (`is(db, PgDatabase)`).
 * Erst bei erster Adapter-Methode — nicht beim Modul-Import / Build.
 */
export const authAdapter: Adapter = new Proxy({} as Adapter, {
  get(_target, prop, receiver) {
    cachedAdapter ??= createAuthAdapter();
    const value = Reflect.get(cachedAdapter as object, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(cachedAdapter)
      : value;
  },
});
