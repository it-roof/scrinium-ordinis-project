import type { CSSProperties } from "react";
import { and, eq } from "drizzle-orm";

import { DashboardAlba } from "@/components/neues-design/dashboard-alba";
import { requireDeskUser } from "@/components/desk/shell/desk-app-shell";
import { DESK_ROLE_LABELS } from "@/lib/area/desk-roles";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { formatDeskGreeting } from "@/lib/users/names";

import "@/app/neues-design/brand-lab.css";

export const dynamic = "force-dynamic";

/**
 * Rechtsanwalt-Dashboard = Design-Lab Alba Manrope.
 * Referenz: /neues-design/alba-manrope
 */
export default async function Page() {
  const ctx = await requireDeskUser();

  const [profile] = await db
    .select({
      lastName: users.lastName,
      salutation: users.salutation,
    })
    .from(users)
    .where(and(eq(users.id, ctx.userId), eq(users.tenantId, ctx.tenantId)))
    .limit(1);

  const greeting = formatDeskGreeting({
    salutation: profile?.salutation,
    lastName: profile?.lastName ?? "",
  });

  return (
    <div
      className="fixed inset-0 z-[60]"
      style={
        {
          "--font-alba-manrope": "var(--font-manrope)",
          "--radius": "0.25rem",
        } as CSSProperties
      }
    >
      <DashboardAlba
        greeting={greeting}
        showAppearanceSwitch
        tenantName={ctx.tenantName}
        user={{
          name: ctx.displayName,
          roleLabel: DESK_ROLE_LABELS[ctx.deskRole],
          email: ctx.email,
        }}
      />
    </div>
  );
}
