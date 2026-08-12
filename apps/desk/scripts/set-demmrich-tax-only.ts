import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const email = "a.demmrich@dr-schneiderbanger.de";
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      allowedModules: users.allowedModules,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  console.log("before", row);

  if (!row) {
    console.error("USER_NOT_FOUND");
    process.exit(1);
  }

  const [updated] = await db
    .update(users)
    .set({ allowedModules: ["tax"] })
    .where(eq(users.email, email))
    .returning({
      id: users.id,
      email: users.email,
      allowedModules: users.allowedModules,
    });

  console.log("after", updated);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
