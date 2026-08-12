import { cookies, headers } from "next/headers";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/**
 * Muss mit Auth.js übereinstimmen.
 * Primär AUTH_URL (wie Auth.js), nicht flaky x-forwarded-proto —
 * sonst setzt Login ggf. `authjs.session-token`, während `auth()` `__Secure-…` liest
 * → Redirect-Loop hinter Coolify.
 */
export function useSecureCookiesSync() {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl) {
    return authUrl.startsWith("https://");
  }

  return process.env.NODE_ENV === "production";
}

async function useSecureCookies() {
  // AUTH_URL zuerst — stabile Cookie-Namen in Prod hinter Proxy
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl) {
    return authUrl.startsWith("https://");
  }

  try {
    const headerStore = await headers();
    const forwardedProto = headerStore
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();

    if (forwardedProto === "https" || forwardedProto === "http") {
      return forwardedProto === "https";
    }
  } catch {
    // headers() außerhalb Request-Kontext
  }

  return process.env.NODE_ENV === "production";
}

export async function getAuthSessionCookieConfig() {
  const secure = await useSecureCookies();

  return {
    name: secure ? SESSION_COOKIE_NAMES[1] : SESSION_COOKIE_NAMES[0],
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure,
    },
  };
}

export function hasAuthSessionCookie(cookieStore: {
  get: (name: string) => { value: string } | undefined;
}) {
  return SESSION_COOKIE_NAMES.some((name) => cookieStore.get(name));
}

/** Beide Session-Cookie-Varianten löschen (Secure + non-Secure). */
export async function clearAuthSessionCookies() {
  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    cookieStore.delete(name);
  }
}
