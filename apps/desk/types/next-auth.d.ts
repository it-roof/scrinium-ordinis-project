import type { DefaultSession } from "next-auth";

import type { DeskRole, PlatformRole, UserRole } from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      deskRole: DeskRole | null;
      tenantId: string;
      platformRole: PlatformRole | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    deskRole: DeskRole | null;
    tenantId: string;
    platformRole: PlatformRole | null;
  }
}

export {};
