import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { authLoginAttempts } from "@/lib/db/schema";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function windowStart(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
}

export async function isLoginBlocked(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(authLoginAttempts)
    .where(
      and(
        eq(authLoginAttempts.email, normalizedEmail),
        gte(authLoginAttempts.createdAt, windowStart())
      )
    );

  return (result?.count ?? 0) >= MAX_ATTEMPTS;
}

export async function recordFailedLogin(email: string): Promise<void> {
  await db.insert(authLoginAttempts).values({
    email: normalizeEmail(email),
  });
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await db
    .delete(authLoginAttempts)
    .where(eq(authLoginAttempts.email, normalizeEmail(email)));
}
