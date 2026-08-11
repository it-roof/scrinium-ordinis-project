import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { hashPassword } = await import("../lib/auth/password");
  const { validatePassword } = await import("../lib/auth/password-policy");
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("create-user.ts")) {
    args.shift();
  }

  const [emailArg, password, name, roleArg] = args;

  if (!emailArg || !password || !name) {
    console.error(
      "Verwendung: pnpm user:create <email> <passwort> <name> [admin|employee]"
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const role = roleArg === "admin" ? "admin" : "employee";

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
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
    });

  console.log("Benutzer angelegt:");
  console.log(`  ID:     ${user.id}`);
  console.log(`  E-Mail: ${user.email}`);
  console.log(`  Name:   ${user.name}`);
  console.log(`  Rolle:  ${user.role}`);
}

main().catch((error) => {
  console.error("Fehler beim Anlegen:", error);
  process.exit(1);
});
