import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { DEFAULT_TENANT_SLUG } = await import("@scrinium/brand");
  const { hashPassword } = await import("../lib/auth/password");
  const { validatePassword } = await import("../lib/auth/password-policy");
  const { db } = await import("../lib/db");
  const { tenants, users } = await import("../lib/db/schema");
  const { resolveUserDisplayName } = await import("../lib/users/names");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("create-user.ts")) {
    args.shift();
  }

  const [emailArg, password, firstNameArg, lastNameArg] = args;

  if (!emailArg || !password || !firstNameArg || !lastNameArg) {
    console.error(
      "Verwendung: pnpm user:create <email> <passwort> <vorname> <nachname> [tenant-slug] [admin|employee] [rechtsanwalt|sekretariat]"
    );
    console.error(`  tenant-slug default: ${DEFAULT_TENANT_SLUG}`);
    console.error("  Position default: rechtsanwalt");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const firstName = firstNameArg.trim();
  const lastName = lastNameArg.trim();
  const name = resolveUserDisplayName({ firstName, lastName });

  let tenantSlug = DEFAULT_TENANT_SLUG;
  let roleArg = "employee";
  let deskRoleArg = "rechtsanwalt";

  const rest = args.slice(4);
  for (const token of rest) {
    if (token === "admin" || token === "employee") {
      roleArg = token;
      continue;
    }
    if (token === "rechtsanwalt" || token === "sekretariat") {
      deskRoleArg = token;
      continue;
    }
    tenantSlug = token;
  }

  const role = roleArg === "admin" ? "admin" : "employee";
  const deskRole =
    deskRoleArg === "sekretariat" ? "sekretariat" : "rechtsanwalt";

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
    console.error(
      "Zuerst anlegen mit: pnpm --filter @scrinium/desk exec tsx scripts/create-tenant.ts"
    );
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
      name,
      firstName,
      lastName,
      passwordHash,
      role,
      deskRole,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      deskRole: users.deskRole,
      tenantId: users.tenantId,
    });

  console.log("Benutzer angelegt:");
  console.log(`  ID:       ${user.id}`);
  console.log(`  E-Mail:   ${user.email}`);
  console.log(`  Name:     ${user.name}`);
  console.log(`  Vorname:  ${user.firstName}`);
  console.log(`  Nachname: ${user.lastName}`);
  console.log(`  Zugang:   ${user.role}`);
  console.log(`  Position: ${user.deskRole}`);
  console.log(`  Tenant:   ${tenant.name} (${tenant.slug})`);
}

main().catch((error) => {
  console.error("Fehler beim Anlegen:", error);
  process.exit(1);
});
