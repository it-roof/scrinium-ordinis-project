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
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
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
