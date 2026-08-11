"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { authorizeCredentials } from "@/lib/auth/authorize";
import { getAuthSessionCookieConfig } from "@/lib/auth/cookies";
import { createUserSession } from "@/lib/auth/sessions";
import { getRequestHostTenant } from "@/lib/tenant/domain";
import { isPlatformSuperAdmin } from "@/lib/tenant/session";

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

  let redirectTo = "/";

  try {
    const hostTenant = await getRequestHostTenant();

    const user = await authorizeCredentials({
      email: typeof email === "string" ? email : "",
      password: typeof password === "string" ? password : "",
    });

    if (!user) {
      return { error: "E-Mail oder Passwort ist ungültig." };
    }

    // Custom-Domain: nur User dieses Tenants (gleiche generische Meldung)
    if (hostTenant && user.tenantId !== hostTenant.id) {
      return { error: "E-Mail oder Passwort ist ungültig." };
    }

    const { sessionToken, expires } = await createUserSession(user.id);
    const sessionCookie = await getAuthSessionCookieConfig();
    const cookieStore = await cookies();

    cookieStore.set(sessionCookie.name, sessionToken, {
      ...sessionCookie.options,
      expires,
    });

    redirectTo = isPlatformSuperAdmin(user) ? "/platform" : "/";
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[loginAction]", error);
    return {
      error: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
    };
  }

  redirect(redirectTo);
}
