const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

function useSecureCookies() {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

  if (authUrl) {
    return authUrl.startsWith("https://");
  }

  return process.env.NODE_ENV === "production";
}

export function getAuthSessionCookieConfig() {
  const secure = useSecureCookies();

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

export function hasAuthSessionCookie(
  cookies: { get: (name: string) => { value: string } | undefined }
) {
  return SESSION_COOKIE_NAMES.some((name) => cookies.get(name));
}
