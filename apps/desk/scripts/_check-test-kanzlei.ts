import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq, count } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { tenants, clients, matters, matterFiles, letters, matterParties } =
    await import("../lib/db/schema");
  const { withTenantDb } = await import("../lib/tenant/db");

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "test-kanzlei"))
    .limit(1);
  if (!tenant) {
    console.log("NO TENANT");
    process.exit(1);
  }
  console.log("tenant", tenant.id, tenant.name);
  await withTenantDb(tenant.id, async (tx) => {
    const [c] = await tx
      .select({ n: count() })
      .from(clients)
      .where(eq(clients.tenantId, tenant.id));
    const [m] = await tx
      .select({ n: count() })
      .from(matters)
      .where(eq(matters.tenantId, tenant.id));
    const [f] = await tx
      .select({ n: count() })
      .from(matterFiles)
      .where(eq(matterFiles.tenantId, tenant.id));
    const [l] = await tx
      .select({ n: count() })
      .from(letters)
      .where(eq(letters.tenantId, tenant.id));
    const [p] = await tx
      .select({ n: count() })
      .from(matterParties)
      .where(eq(matterParties.tenantId, tenant.id));
    console.log({
      clients: Number(c?.n),
      matters: Number(m?.n),
      files: Number(f?.n),
      letters: Number(l?.n),
      parties: Number(p?.n),
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
