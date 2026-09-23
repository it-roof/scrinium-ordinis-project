import type { CSSProperties } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import { isDevPasswordlessLoginEnabled } from "@/lib/auth/dev-passwordless";
import {
  getRequestHostTenant,
  hostTenantDisplayBrand,
} from "@/lib/tenant/domain";
import { isPlatformSuperAdmin } from "@/lib/tenant/session";

import "@/app/neues-design/brand-lab.css";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect(isPlatformSuperAdmin(session.user) ? "/platform" : "/");
  }

  const hostTenant = await getRequestHostTenant();
  const brandLabel = hostTenantDisplayBrand(hostTenant);

  return (
    <div data-lab-appearance="light">
      <div
        className="brand-lab-root brand-alba brand-alba-manrope flex min-h-dvh flex-col"
        style={
          {
            "--font-alba-manrope": "var(--font-manrope)",
            "--radius": "0.25rem",
            position: "relative",
            inset: "auto",
            zIndex: "auto",
            overflow: "auto",
          } as CSSProperties
        }
      >
        <main className="lab-login mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12 md:px-8 md:py-16">
          <LoginForm
            brandLabel={brandLabel}
            passwordless={isDevPasswordlessLoginEnabled()}
          />
        </main>
      </div>
    </div>
  );
}
