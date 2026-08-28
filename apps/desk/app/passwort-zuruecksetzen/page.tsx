import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  getRequestHostTenant,
  hostTenantDisplayBrand,
} from "@/lib/tenant/domain";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;
  const hostTenant = await getRequestHostTenant();
  const brandLabel = hostTenantDisplayBrand(hostTenant);

  return (
    <div className="content-canvas flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <ResetPasswordForm token={token?.trim() ?? ""} brandLabel={brandLabel} />
    </div>
  );
}
