"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { authorizeCredentials } from "@/lib/auth/authorize";
import { authAdapter } from "@/lib/auth/adapter";
import {
  clearAuthSessionCookies,
  getAuthSessionCookieConfig,
} from "@/lib/auth/cookies";
import { createUserSession } from "@/lib/auth/sessions";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState | null> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const user = await authorizeCredentials({
      email: typeof email === "string" ? email : "",
      password: typeof password === "string" ? password : "",
    });

    if (!user) {
      return { error: "E-Mail oder Passwort ist ungültig." };
    }

    const { sessionToken, expires } = await createUserSession(user.id);
    const sessionCookie = await getAuthSessionCookieConfig();
    const cookieStore = await cookies();

    await clearAuthSessionCookies();

    cookieStore.set(sessionCookie.name, sessionToken, {
      ...sessionCookie.options,
      expires,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[loginAction]", error);
    return {
      error: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
    };
  }

  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionCookie = await getAuthSessionCookieConfig();
  const token = cookieStore.get(sessionCookie.name)?.value;

  if (token) {
    try {
      await authAdapter.deleteSession?.(token);
    } catch (error) {
      console.error("[logoutAction] session delete", error);
    }
  }

  await clearAuthSessionCookies();
  redirect("/login");
}
