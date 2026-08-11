import NextAuth from "next-auth";

import { authAdapter } from "@/lib/auth/adapter";
import { authConfig } from "@/lib/auth/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: authAdapter,
});
