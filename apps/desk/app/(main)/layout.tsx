import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  ACTIVE_AREA_COOKIE,
  parseActiveArea,
} from "@/lib/area/active-area";
import { parseAreaFromPathname } from "@/lib/area/paths";
import { PRODUCT_WORDMARK } from "@/lib/brand";
import { AppShell } from "@/components/layout/app-shell";
import { checkDatabaseConnection } from "@/lib/db/health";
import { getTenantDisplayBrand } from "@/lib/tenant/brand";
import { getTenantEnabledModules } from "@/lib/tenant/modules";
import { isPlatformSuperAdmin } from "@/lib/tenant/session";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSuperAdmin = isPlatformSuperAdmin(session.user);

  if (isSuperAdmin && !pathname.startsWith("/platform")) {
    redirect("/platform");
  }

  if (!isSuperAdmin && pathname.startsWith("/platform")) {
    redirect("/");
  }

  const [brandLabel, enabledModules, dbConnected, cookieStore] =
    await Promise.all([
      isSuperAdmin
        ? Promise.resolve(PRODUCT_WORDMARK)
        : getTenantDisplayBrand(session.user.tenantId),
      isSuperAdmin
        ? Promise.resolve([])
        : getTenantEnabledModules(session.user.tenantId),
      checkDatabaseConnection(),
      cookies(),
    ]);

  const areaFromPath = parseAreaFromPathname(pathname);
  const initialActiveArea =
    areaFromPath && enabledModules.includes(areaFromPath)
      ? areaFromPath
      : parseActiveArea(
          cookieStore.get(ACTIVE_AREA_COOKIE)?.value,
          enabledModules
        );

  return (
    <AppShell
      user={session.user}
      brandLabel={brandLabel}
      allowedAreas={enabledModules}
      initialActiveArea={initialActiveArea}
      dbConnected={dbConnected}
    >
      {children}
    </AppShell>
  );
}
