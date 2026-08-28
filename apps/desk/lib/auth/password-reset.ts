import { createHash, randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/password-policy";
import {
  createUserSession,
  revokeAllUserSessions,
} from "@/lib/auth/sessions";
import {
  clearAuthSessionCookies,
  getAuthSessionCookieConfig,
} from "@/lib/auth/cookies";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { getAppBaseUrl, sendSystemMail } from "@/lib/mail/system";
import { cookies } from "next/headers";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function createResetTokenForUser(userId: string): Promise<string> {
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return token;
}

async function wasRecentlyRequested(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - MIN_REQUEST_INTERVAL_MS).toISOString();
  const [row] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        gt(passwordResetTokens.createdAt, since)
      )
    )
    .limit(1);

  return Boolean(row);
}

async function sendResetMail(email: string, token: string) {
  const link = `${getAppBaseUrl()}/passwort-zuruecksetzen?token=${token}`;

  return sendSystemMail({
    to: email,
    subject: "Scrinium Ordinis — Passwort zurücksetzen",
    text: [
      "Du hast das Zurücksetzen deines Passworts angefordert.",
      "",
      `Link (60 Minuten gültig):`,
      link,
      "",
      "Wenn du das nicht warst, kannst du diese E-Mail ignorieren.",
    ].join("\n"),
  });
}

const GENERIC_OK =
  "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link gesendet.";

/** Öffentlich: kein Hinweis, ob die E-Mail existiert. */
export async function requestPasswordResetByEmail(emailRaw: string): Promise<{
  success: true;
  message: string;
} | {
  success: false;
  error: string;
}> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) {
    return { success: false, error: "Bitte eine E-Mail-Adresse angeben." };
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return { success: true, message: GENERIC_OK };
  }

  if (await wasRecentlyRequested(user.id)) {
    return { success: true, message: GENERIC_OK };
  }

  const token = await createResetTokenForUser(user.id);
  const sent = await sendResetMail(user.email, token);

  if (!sent.ok) {
    return { success: false, error: sent.error };
  }

  return { success: true, message: GENERIC_OK };
}

/** Eingeloggt: Link an die eigene Login-E-Mail. */
export async function requestPasswordResetForUser(user: {
  id: string;
  email: string;
}): Promise<{ success: true; message: string } | { success: false; error: string }> {
  if (await wasRecentlyRequested(user.id)) {
    return {
      success: false,
      error: "Bitte warte kurz, bevor du erneut einen Link anforderst.",
    };
  }

  const token = await createResetTokenForUser(user.id);
  const sent = await sendResetMail(user.email, token);

  if (!sent.ok) {
    return { success: false, error: sent.error };
  }

  return {
    success: true,
    message: `Link wurde an ${user.email} gesendet.`,
  };
}

export async function resetPasswordWithToken(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const token = input.token.trim();
  if (!token) {
    return { success: false, error: "Link ist ungültig oder abgelaufen." };
  }

  const policyError = validatePassword(input.newPassword);
  if (policyError) {
    return { success: false, error: policyError };
  }

  if (input.newPassword !== input.confirmPassword) {
    return {
      success: false,
      error: "Neues Passwort und Bestätigung stimmen nicht überein.",
    };
  }

  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.expiresAt < now) {
    if (row) {
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.id, row.id));
    }
    return { success: false, error: "Link ist ungültig oder abgelaufen." };
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, row.userId));

  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, row.userId));

  await revokeAllUserSessions(row.userId);
  const { sessionToken, expires } = await createUserSession(row.userId);
  const sessionCookie = await getAuthSessionCookieConfig();
  const cookieStore = await cookies();

  await clearAuthSessionCookies();
  cookieStore.set(sessionCookie.name, sessionToken, {
    ...sessionCookie.options,
    expires,
  });

  return { success: true };
}
