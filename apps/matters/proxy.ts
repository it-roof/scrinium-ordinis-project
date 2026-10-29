import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { hasAuthSessionCookie } from "@/lib/auth/cookies";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isLoggedIn = hasAuthSessionCookie(request.cookies);

  if (isLoginPage) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|generated/|font/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)).*)",
  ],
};
