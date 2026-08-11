import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { DEFAULT_TENANT_SLUG } = await import("@scrinium/brand");
  const { hashPassword } = await import("../lib/auth/password");
  const { validatePassword } = await import("../lib/auth/password-policy");
  const { db } = await import("../lib/db");
  const { tenants, users } = await import("../lib/db/schema");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("create-user.ts")) {
    args.shift();
  }

  const [emailArg, password, name, roleOrTenant, maybeRole] = args;

  if (!emailArg || !password || !name) {
    console.error(
      "Verwendung: pnpm user:create <email> <passwort> <name> [tenant-slug] [admin|employee]"
    );
    console.error(
      `  tenant-slug default: ${DEFAULT_TENANT_SLUG}`
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();

  let tenantSlug = DEFAULT_TENANT_SLUG;
  let roleArg = "employee";

  if (roleOrTenant === "admin" || roleOrTenant === "employee") {
    roleArg = roleOrTenant;
  } else if (roleOrTenant) {
    tenantSlug = roleOrTenant;
    if (maybeRole === "admin" || maybeRole === "employee") {
      roleArg = maybeRole;
    }
  }

  const role = roleArg === "admin" ? "admin" : "employee";

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    console.error(`Tenant nicht gefunden: ${tenantSlug}`);
    console.error("Zuerst anlegen mit: pnpm --filter @scrinium/desk exec tsx scripts/create-tenant.ts");
    process.exit(1);
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.error(`Benutzer existiert bereits: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email,
      name: name.trim(),
      passwordHash,
      role,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      tenantId: users.tenantId,
    });

  console.log("Benutzer angelegt:");
  console.log(`  ID:       ${user.id}`);
  console.log(`  E-Mail:   ${user.email}`);
  console.log(`  Name:     ${user.name}`);
  console.log(`  Rolle:    ${user.role}`);
  console.log(`  Tenant:   ${tenant.name} (${tenant.slug})`);
}

main().catch((error) => {
  console.error("Fehler beim Anlegen:", error);
  process.exit(1);
});
