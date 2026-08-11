"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

    cookieStore.set(sessionCookie.name, sessionToken, {
      ...sessionCookie.options,
      expires,
    });
  } catch (error) {
    console.error("[loginAction]", error);
    return {
      error: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
    };
  }

  // Cookie + Redirect in derselben Server-Action-Antwort (zuverlässiger als Client-Navigation)
  redirect("/");
}
