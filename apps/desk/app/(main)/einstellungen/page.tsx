import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { SmtpSettingsForm } from "@/components/settings/smtp-settings-form";
import { getMySmtpSettingsAction } from "@/lib/smtp/actions";
import { requireTenantUser } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireTenantUser();
  const settings = await getMySmtpSettingsAction();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10">
      <PageHeader
        title="Einstellungen"
        description="Persönliches Konto und SMTP für den E-Mail-Versand."
      />

      <AccountSettingsForm
        name={user.name?.trim() || ""}
        email={user.email?.trim().toLowerCase() || ""}
      />

      <SmtpSettingsForm
        initial={settings}
        defaultFromName={user.name?.trim() || ""}
        defaultFromEmail={user.email?.trim().toLowerCase() || ""}
      />
    </div>
  );
}
