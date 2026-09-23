import { and, eq } from "drizzle-orm";

import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { SmtpSettingsForm } from "@/components/settings/smtp-settings-form";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getMySmtpSettingsAction } from "@/lib/smtp/actions";
import { formatUserName } from "@/lib/users/names";

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
    <DeskAppShell ctx={ctx} headerTitle="Einstellungen">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 overflow-y-auto p-4 lg:p-6">
        <AccountSettingsForm
          firstName={firstName}
          lastName={lastName}
          email={ctx.email.trim().toLowerCase()}
          dashboardView={dashboardView}
        />

        <SmtpSettingsForm
          initial={settings}
          defaultFromName={displayName}
          defaultFromEmail={ctx.email.trim().toLowerCase()}
        />
      </div>
    </DeskAppShell>
  );
}
