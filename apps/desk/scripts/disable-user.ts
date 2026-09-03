import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { revokeAllUserSessions } = await import("../lib/auth/sessions");
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const args = process.argv.slice(2);
  if (args[0]?.endsWith("disable-user.ts")) {
    args.shift();
  }

  const [emailArg, action = "disable"] = args;
  if (!emailArg || (action !== "disable" && action !== "enable")) {
    console.error(
      "Verwendung: pnpm --filter @scrinium/desk exec tsx scripts/disable-user.ts <email> [disable|enable]"
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      disabledAt: users.disabledAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.error(`Benutzer nicht gefunden: ${email}`);
    process.exit(1);
  }

  const disabledAt = action === "disable" ? new Date().toISOString() : null;

  const [updated] = await db
    .update(users)
    .set({ disabledAt })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      disabledAt: users.disabledAt,
    });

  if (action === "disable") {
    await revokeAllUserSessions(user.id);
  }

  console.log(action === "disable" ? "Benutzer deaktiviert:" : "Benutzer aktiviert:");
  console.log(`  ID:          ${updated.id}`);
  console.log(`  E-Mail:      ${updated.email}`);
  console.log(`  Name:        ${updated.name}`);
  console.log(`  disabledAt:  ${updated.disabledAt ?? "—"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
