import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { hasAuthSessionCookie } from "@/lib/auth/cookies";
import { isMaintenanceMode } from "@/lib/maintenance";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isWartungPage = pathname === "/wartung";

  // Alte /bereich/...-URLs → /...
  if (pathname === "/bereich" || pathname.startsWith("/bereich/")) {
    const nextPath =
      pathname === "/bereich" ? "/" : pathname.replace(/^\/bereich/, "") || "/";
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (isMaintenanceMode()) {
    if (isWartungPage) {
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    return NextResponse.redirect(new URL("/wartung", request.url));
  }

  if (isWartungPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isLoginPage = pathname === "/login";
  const isLoggedIn = hasAuthSessionCookie(request.cookies);

  if (isLoginPage) {
    // Kein Redirect anhand Cookie allein — sonst Loop hinter Coolify, wenn
    // Cookie-Name und auth() nicht übereinstimmen. Die Login-Page prüft auth().
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Verwaise Session-Cookies (Secure vs. non-Secure) wegräumen, wenn die
    // Login-Page gerendert wird — nur wenn wir nicht sicher eingeloggt sind.
    // auth() läuft erst in der Page; hier löschen wir beide Varianten nicht,
    // sondern nur wenn beide gleichzeitig existieren (Mismatch).
    const hasPlain = Boolean(request.cookies.get("authjs.session-token"));
    const hasSecure = Boolean(
      request.cookies.get("__Secure-authjs.session-token")
    );
    if (hasPlain && hasSecure) {
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-authjs.session-token");
    }

    return response;
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|font).*)",
  ],
};
