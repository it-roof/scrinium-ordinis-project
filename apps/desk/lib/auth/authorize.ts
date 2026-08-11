import { verifyPassword } from "@/lib/auth/password";
import {
  clearLoginAttempts,
  isLoginBlocked,
  recordFailedLogin,
} from "@/lib/auth/rate-limit";
import { getUserByEmail } from "@/lib/auth/users";

// Konstante für Timing-sichere Prüfung, wenn der User nicht existiert.
const DUMMY_PASSWORD_HASH =
  "$2b$12$2Imc/kJ4ob9vz15sCgWc8OC0RJLCSgaLtASlr5ptLEH9li0xdeUdy";

async function rejectLogin(email: string) {
  if (email) {
    await recordFailedLogin(email);
  }

  return null;
}

export async function authorizeCredentials(credentials: Record<string, unknown>) {
  const email =
    typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return null;
  }

  if (await isLoginBlocked(email)) {
    return null;
  }

  const user = await getUserByEmail(email);
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!user || !valid) {
    return rejectLogin(email);
  }

  await clearLoginAttempts(email);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
