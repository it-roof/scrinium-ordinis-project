"use server";

import { cookies } from "next/headers";

import { authorizeCredentials } from "@/lib/auth/authorize";
import { getAuthSessionCookieConfig } from "@/lib/auth/cookies";
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

  const user = await authorizeCredentials({
    email: typeof email === "string" ? email : "",
    password: typeof password === "string" ? password : "",
  });

  if (!user) {
    return { error: "E-Mail oder Passwort ist ungültig." };
  }

  const { sessionToken, expires } = await createUserSession(user.id);
  const sessionCookie = getAuthSessionCookieConfig();
  const cookieStore = await cookies();

  cookieStore.set(sessionCookie.name, sessionToken, {
    ...sessionCookie.options,
    expires,
  });

  return { success: true };
}
