"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/password-policy";
import {
  clearAuthSessionCookies,
  getAuthSessionCookieConfig,
} from "@/lib/auth/cookies";
import {
  createUserSession,
  revokeAllUserSessions,
} from "@/lib/auth/sessions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/tenant/session";

export async function updateMyProfileAction(input: { name: string }) {
  const user = await requireSessionUser();
  if (!user) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false as const, error: "Bitte einen Namen angeben." };
  }

  await db.update(users).set({ name }).where(eq(users.id, user.id));
  revalidatePath("/einstellungen");
  revalidatePath("/", "layout");

  return { success: true as const, name };
}

export async function changeMyPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const user = await requireSessionUser();
  if (!user) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;

  if (!currentPassword.trim()) {
    return {
      success: false as const,
      error: "Bitte das aktuelle Passwort angeben.",
    };
  }

  const policyError = validatePassword(newPassword);
  if (policyError) {
    return { success: false as const, error: policyError };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false as const,
      error: "Neues Passwort und Bestätigung stimmen nicht überein.",
    };
  }

  if (currentPassword === newPassword) {
    return {
      success: false as const,
      error: "Das neue Passwort muss sich vom aktuellen unterscheiden.",
    };
  }

  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row) {
    return { success: false as const, error: "Benutzer nicht gefunden." };
  }

  const currentOk = await verifyPassword(currentPassword, row.passwordHash);
  if (!currentOk) {
    return {
      success: false as const,
      error: "Aktuelles Passwort ist ungültig.",
    };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  await revokeAllUserSessions(user.id);
  const { sessionToken, expires } = await createUserSession(user.id);
  const sessionCookie = await getAuthSessionCookieConfig();
  const cookieStore = await cookies();

  await clearAuthSessionCookies();
  cookieStore.set(sessionCookie.name, sessionToken, {
    ...sessionCookie.options,
    expires,
  });

  revalidatePath("/einstellungen");

  return { success: true as const };
}
