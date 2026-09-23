import type { CSSProperties } from "react";
import { and, eq } from "drizzle-orm";

import { SettingsAlba } from "@/components/neues-design/settings-alba";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { SmtpSettingsForm } from "@/components/settings/smtp-settings-form";
import { requireDeskUser } from "@/components/desk/shell/desk-app-shell";
import { DESK_ROLE_LABELS } from "@/lib/area/desk-roles";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getMySmtpSettingsAction } from "@/lib/smtp/actions";
import { formatUserName } from "@/lib/users/names";

import "@/app/neues-design/brand-lab.css";

export const dynamic = "force-dynamic";

export default async function DeskSettingsPage() {
  const ctx = await requireDeskUser();
  const settings = await getMySmtpSettingsAction();

  const [profile] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
      dashboardView: users.dashboardView,
    })
    .from(users)
    .where(and(eq(users.id, ctx.userId), eq(users.tenantId, ctx.tenantId)))
    .limit(1);

  const firstName = profile?.firstName?.trim() || "";
  const lastName = profile?.lastName?.trim() || "";
  const displayName =
    formatUserName({ firstName, lastName }) || ctx.displayName;
  const dashboardView = profile?.dashboardView === "all" ? "all" : "quick";

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
      <SettingsAlba
        tenantName={ctx.tenantName}
        user={{
          name: ctx.displayName,
          roleLabel: DESK_ROLE_LABELS[ctx.deskRole],
          email: ctx.email,
        }}
      >
        <AccountSettingsForm
          firstName={firstName}
          lastName={lastName}
          email={ctx.email.trim().toLowerCase()}
          dashboardView={dashboardView}
        />
        <AppearanceSettings />
        <SmtpSettingsForm
          initial={settings}
          defaultFromName={displayName}
          defaultFromEmail={ctx.email.trim().toLowerCase()}
        />
      </SettingsAlba>
    </div>
  );
}
