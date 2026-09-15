import { redirect } from "next/navigation";

import { requireTenantUser } from "@/lib/tenant/session";
import { getUserDeskRole } from "@/lib/tenant/modules";
import { isDeskRoleId } from "@/lib/area/desk-roles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireTenantUser();
  const deskRole = await getUserDeskRole(user.id, user.tenantId);

  if (deskRole && isDeskRoleId(deskRole)) {
    redirect("/v1/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-3 py-16 text-center">
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        Keine Position zugewiesen
      </h1>
      <p className="text-sm text-muted-foreground">
        Für deinen Zugang ist noch keine Kanzlei-Position hinterlegt. Bitte
        einen Administrator kontaktieren.
      </p>
    </div>
  );
}
