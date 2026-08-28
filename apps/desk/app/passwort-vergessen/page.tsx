import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { auth } from "@/lib/auth";
import {
  getRequestHostTenant,
  hostTenantDisplayBrand,
} from "@/lib/tenant/domain";
import { isPlatformSuperAdmin } from "@/lib/tenant/session";

export default async function ForgotPasswordPage() {
  const session = await auth();

  if (session?.user) {
    redirect(isPlatformSuperAdmin(session.user) ? "/platform" : "/");
  }

  const hostTenant = await getRequestHostTenant();
  const brandLabel = hostTenantDisplayBrand(hostTenant);

  return (
    <div className="content-canvas flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <ForgotPasswordForm brandLabel={brandLabel} />
    </div>
  );
}
