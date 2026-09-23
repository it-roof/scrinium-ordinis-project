import { redirect } from "next/navigation";

import { isDeskRoleId } from "@/lib/area/desk-roles";
import { auth } from "@/lib/auth";
import { getUserDeskRole } from "@/lib/tenant/modules";

export const dynamic = "force-dynamic";

/**
 * Root: Desk-Nutzer → Dashboard; ohne Position → Hinweis.
 */
export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const deskRole = await getUserDeskRole(
    session.user.id,
    session.user.tenantId
  );

  if (deskRole && isDeskRoleId(deskRole)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        Keine Position zugewiesen
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Für deinen Zugang ist noch keine Kanzlei-Position hinterlegt. Bitte
        einen Administrator kontaktieren.
      </p>
    </div>
  );
}
