import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type DbClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  client: DbClient | undefined;
  db: Db | undefined;
};

function createClient(): DbClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }

  return postgres(url, {
    prepare: false,
    max: 10,
  });
}

function createDb(): Db {
  const client = globalForDb.client ?? createClient();

  if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
  }

  return drizzle(client, { schema });
}

/** Echte Drizzle-Instanz — erst bei erster Nutzung, nicht beim Modul-Import. */
export function getDb(): Db {
  globalForDb.db ??= createDb();
  return globalForDb.db;
}

/**
 * Bequemer Zugriff für bestehendes `db.*`-API.
 * Hinweis: Nicht an DrizzleAdapter übergeben (`is()` erkennt Proxy nicht) —
 * dort `getDb()` / lazy Adapter nutzen.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
