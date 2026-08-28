import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { hashPassword } = await import("../lib/auth/password");
  const { validatePassword } = await import("../lib/auth/password-policy");
  const { revokeAllUserSessions } = await import("../lib/auth/sessions");
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("reset-user-password.ts")) {
    args.shift();
  }

  const [emailArg, password] = args;

  if (!emailArg || !password) {
    console.error(
      "Verwendung: pnpm --filter @scrinium/desk exec tsx scripts/reset-user-password.ts <email> <passwort>"
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      platformRole: users.platformRole,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.error(`Benutzer nicht gefunden: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  await revokeAllUserSessions(user.id);

  console.log("Passwort gesetzt:");
  console.log(`  E-Mail:    ${user.email}`);
  console.log(`  Name:      ${user.name}`);
  console.log(`  Plattform: ${user.platformRole ?? "—"}`);
  console.log("Bestehende Sessions wurden beendet.");
}

main().catch((error) => {
  console.error("Fehler:", error);
  process.exit(1);
});
