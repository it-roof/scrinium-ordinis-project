import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("update-user-email.ts")) {
    args.shift();
  }

  const [currentEmailArg, newEmailArg] = args;

  if (!currentEmailArg || !newEmailArg) {
    console.error(
      "Verwendung: pnpm tsx scripts/update-user-email.ts <alte-email> <neue-email>"
    );
    process.exit(1);
  }

  const currentEmail = currentEmailArg.trim().toLowerCase();
  const newEmail = newEmailArg.trim().toLowerCase();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, currentEmail))
    .limit(1);

  if (!user) {
    console.error(`Benutzer nicht gefunden: ${currentEmail}`);
    process.exit(1);
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, newEmail))
    .limit(1);

  if (existing) {
    console.error(`E-Mail ist bereits vergeben: ${newEmail}`);
    process.exit(1);
  }

  const [updated] = await db
    .update(users)
    .set({ email: newEmail })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  console.log("E-Mail aktualisiert:");
  console.log(`  ID:     ${updated.id}`);
  console.log(`  Name:   ${updated.name}`);
  console.log(`  Rolle:  ${updated.role}`);
  console.log(`  Alt:    ${user.email}`);
  console.log(`  Neu:    ${updated.email}`);
}

main().catch((error) => {
  console.error("Fehler:", error);
  process.exit(1);
});
