import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }

  const connection = postgres(url, { max: 1, prepare: false });

  await migrate(drizzle(connection), {
    migrationsFolder: "./drizzle",
    migrationsSchema: "drizzle",
  });

  await connection.end();
  console.log("Migrationen erfolgreich angewendet.");
}

main().catch((error) => {
  console.error("Migration fehlgeschlagen:", error);
  process.exit(1);
});
