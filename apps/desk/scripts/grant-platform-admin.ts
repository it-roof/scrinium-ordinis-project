import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("grant-platform-admin.ts")) {
    args.shift();
  }

  const emailArg = args[0];
  const revoke = args.includes("--revoke");

  if (!emailArg) {
    console.error(
      "Verwendung: pnpm platform:grant <email> [--revoke]"
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();

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

  const [updated] = await db
    .update(users)
    .set({ platformRole: revoke ? null : "super_admin" })
    .where(eq(users.id, user.id))
    .returning({
      email: users.email,
      name: users.name,
      platformRole: users.platformRole,
    });

  console.log(revoke ? "Plattform-Recht entzogen:" : "Plattform-Super-Admin gesetzt:");
  console.log(`  E-Mail: ${updated.email}`);
  console.log(`  Name:   ${updated.name}`);
  console.log(`  Rolle:  ${updated.platformRole ?? "—"}`);
  console.log("Danach neu einloggen, damit die Session aktualisiert wird.");
}

main().catch((error) => {
  console.error("Fehler:", error);
  process.exit(1);
});
