import { headers } from "next/headers";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/**
 * Muss mit Auth.js übereinstimmen: `useSecureCookies ?? url.protocol === "https:"`.
 * Hinter Coolify/Proxy zählt `x-forwarded-proto`, nicht nur AUTH_URL/NODE_ENV —
 * sonst setzt Login z. B. `authjs.session-token`, während `auth()` `__Secure-…` liest.
 */
async function useSecureCookies() {
  const headerStore = await headers();
  const forwardedProto = headerStore
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto === "https" || forwardedProto === "http") {
    return forwardedProto === "https";
  }

  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl) {
    return authUrl.startsWith("https://");
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

export function hasAuthSessionCookie(cookies: {
  get: (name: string) => { value: string } | undefined;
}) {
  return SESSION_COOKIE_NAMES.some((name) => cookies.get(name));
}
