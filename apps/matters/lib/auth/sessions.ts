import { eq } from "drizzle-orm";

import { authAdapter } from "@/lib/auth/adapter";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function getSessionExpiresAt() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

export async function createUserSession(userId: string) {
  const sessionToken = crypto.randomUUID();
  const expires = getSessionExpiresAt();

  await authAdapter.createSession!({
    sessionToken,
    userId,
    expires,
  });

  return { sessionToken, expires };
}

export async function revokeAllUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
