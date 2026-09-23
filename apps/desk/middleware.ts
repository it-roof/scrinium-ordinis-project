import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACTIVE_AREA_COOKIE } from "@/lib/area/active-area";
import {
  DESK_SCOPED_FLAT_SEGMENTS,
  PRACTICE_SLUGS,
  practiceFromSlug,
  slugForPractice,
} from "@/lib/area/paths";
import { hasAuthSessionCookie } from "@/lib/auth/cookies";
import { isAppModuleId } from "@/lib/modules";
import { isMaintenanceMode } from "@/lib/maintenance";

/**
 * Practice-Prefix für Funktionen, die kanonisch flach sind.
 * /r/prompt → /prompt, /s/eingang → /eingang, …
 */
const PRACTICE_PREFIXED_FLAT: Record<string, string> = {
  prompt: "/prompt",
  eingang: "/eingang",
  gesendet: "/gesendet",
  zuweisen: "/zuweisen",
  ki: "/ki",
  notizen: "/notizen",
  vertragsanalyse: "/vertragsanalyse",
};

function practiceSlugFromCookie(request: NextRequest): string {
  const raw = request.cookies.get(ACTIVE_AREA_COOKIE)?.value;
  if (raw && isAppModuleId(raw)) {
    return slugForPractice(raw);
  }
  return slugForPractice("legal");
}

function redirectFlatScopedToPractice(
  request: NextRequest,
  pathname: string
): NextResponse | null {
  for (const segment of DESK_SCOPED_FLAT_SEGMENTS) {
    if (pathname === `/${segment}` || pathname.startsWith(`/${segment}/`)) {
      const slug = practiceSlugFromCookie(request);
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}${pathname}`;
      return NextResponse.redirect(url);
    }
  }
  return null;
}

function redirectPracticePrefixedFlat(
  request: NextRequest,
  pathname: string
): NextResponse | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const [slug, segment, ...rest] = parts;
  const practice = practiceFromSlug(slug);
  if (!practice || !segment) {
    return null;
  }

  // Nur kanonische Practice-Slugs
  if (slugForPractice(practice) !== slug) {
    return null;
  }

  const flatBase = PRACTICE_PREFIXED_FLAT[segment];
  if (!flatBase) {
    return null;
  }

  const url = request.nextUrl.clone();
  const suffix = rest.length > 0 ? `/${rest.join("/")}` : "";
  url.pathname = `${flatBase}${suffix}`;
  return NextResponse.redirect(url);
}

function syncPracticeCookie(
  response: NextResponse,
  pathname: string
): void {
  const first = pathname.split("/")[1];
  if (!first) {
    return;
  }
  const practice = practiceFromSlug(first);
  if (!practice || slugForPractice(practice) !== first) {
    return;
  }
  const known = (Object.values(PRACTICE_SLUGS) as string[]).includes(first);
  if (!known) {
    return;
  }
  response.cookies.set(ACTIVE_AREA_COOKIE, practice, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isWartungPage = pathname === "/wartung";

  // /mandanten → /{practice}/mandanten
  const scoped = redirectFlatScopedToPractice(request, pathname);
  if (scoped) {
    return scoped;
  }

  // /r/prompt → /prompt
  const practicePrefixed = redirectPracticePrefixedFlat(request, pathname);
  if (practicePrefixed) {
    return practicePrefixed;
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
  const isPasswordResetPage =
    pathname === "/passwort-vergessen" ||
    pathname === "/passwort-zuruecksetzen";
  const isPublicIntake =
    pathname === "/aufnahme" || pathname.startsWith("/aufnahme/");
  const isDatenschutzPage = pathname === "/datenschutz-erstinformation";
  const isLoggedIn = hasAuthSessionCookie(request.cookies);

  if (
    isLoginPage ||
    isPasswordResetPage ||
    isPublicIntake ||
    isDatenschutzPage
  ) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

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

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  syncPracticeCookie(response, pathname);

  return response;
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|font).*)",
  ],
};
