import { and, eq } from "drizzle-orm";

import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { SmtpSettingsForm } from "@/components/settings/smtp-settings-form";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getMySmtpSettingsAction } from "@/lib/smtp/actions";
import { requireTenantUser } from "@/lib/tenant/session";
import { formatUserName } from "@/lib/users/names";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireTenantUser();
  const settings = await getMySmtpSettingsAction();

  const [profile] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
    })
    .from(users)
    .where(and(eq(users.id, user.id), eq(users.tenantId, user.tenantId)))
    .limit(1);

  const firstName = profile?.firstName?.trim() || "";
  const lastName = profile?.lastName?.trim() || "";
  const displayName =
    formatUserName({ firstName, lastName }) || user.name?.trim() || "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10">
      <PageHeader
        title="Einstellungen"
        description="Persönliches Konto und SMTP für den E-Mail-Versand."
      />

      <AccountSettingsForm
        firstName={firstName}
        lastName={lastName}
        email={user.email?.trim().toLowerCase() || ""}
      />

      <SmtpSettingsForm
        initial={settings}
        defaultFromName={displayName}
        defaultFromEmail={user.email?.trim().toLowerCase() || ""}
      />
    </div>
  );
}
