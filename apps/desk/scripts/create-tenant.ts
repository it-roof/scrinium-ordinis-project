import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { DEFAULT_TENANT_NAME, DEFAULT_TENANT_SLUG } = await import(
    "@scrinium/brand"
  );
  const { db } = await import("../lib/db");
  const { tenants } = await import("../lib/db/schema");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("create-tenant.ts")) {
    args.shift();
  }

  const name = (args[0] ?? DEFAULT_TENANT_NAME).trim();
  const slug = (args[1] ?? DEFAULT_TENANT_SLUG).trim().toLowerCase();

  if (!name || !slug) {
    console.error("Verwendung: pnpm tenant:create [name] [slug]");
    process.exit(1);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    console.error(
      "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten."
    );
    process.exit(1);
  }

  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    console.error(`Tenant existiert bereits: ${slug}`);
    process.exit(1);
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ name, slug })
    .returning();

  console.log("Tenant angelegt:");
  console.log(`  ID:   ${tenant.id}`);
  console.log(`  Name: ${tenant.name}`);
  console.log(`  Slug: ${tenant.slug}`);
}

main().catch((error) => {
  console.error("Fehler beim Anlegen:", error);
  process.exit(1);
});
