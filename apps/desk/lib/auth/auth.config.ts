import type { NextAuthConfig } from "next-auth";

import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/sessions";
import type { UserRole } from "@/lib/db/schema";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role as UserRole;
      }

      return session;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
