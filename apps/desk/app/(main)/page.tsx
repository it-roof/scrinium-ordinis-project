import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACTIVE_AREA_COOKIE,
  parseActiveArea,
} from "@/lib/area/active-area";
import { areaBasePath } from "@/lib/area/paths";
import { requireTenantUser } from "@/lib/tenant/session";
import { getUserEffectiveModules } from "@/lib/tenant/modules";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireTenantUser();
  const enabledModules = await getUserEffectiveModules(user.id, user.tenantId);
  const preferred = (await cookies()).get(ACTIVE_AREA_COOKIE)?.value;
  const area = parseActiveArea(preferred, enabledModules);

  if (area !== "all") {
    redirect(areaBasePath(area));
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-3 py-16 text-center">
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        Kein Bereich freigeschaltet
      </h1>
      <p className="text-sm text-muted-foreground">
        Für deinen Zugang sind noch keine Fach-Bereiche verfügbar. Bitte einen
        Administrator kontaktieren.
      </p>
    </div>
  );
}
