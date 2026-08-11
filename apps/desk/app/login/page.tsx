import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import {
  getRequestHostTenant,
  hostTenantDisplayBrand,
} from "@/lib/tenant/domain";
import { isPlatformSuperAdmin } from "@/lib/tenant/session";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect(isPlatformSuperAdmin(session.user) ? "/platform" : "/");
  }

  const hostTenant = await getRequestHostTenant();
  const brandLabel = hostTenantDisplayBrand(hostTenant);

  return (
    <div className="content-canvas flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <LoginForm brandLabel={brandLabel} />
    </div>
  );
}
