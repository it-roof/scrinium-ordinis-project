import { and, eq } from "drizzle-orm";

import { AreaStartView } from "@/components/home/area-start-view";
import { requireAreaFromSlug } from "@/lib/area/require-function";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  getStaffDashboardLists,
  getStaffDashboardStats,
} from "@/lib/staff-messages/storage";
import { getTenantDisplayBrand } from "@/lib/tenant/brand";
import {
  getUserAllowedFunctions,
  getUserDeskRole,
} from "@/lib/tenant/modules";
import { formatDeskGreeting } from "@/lib/users/names";

export const dynamic = "force-dynamic";

type AreaStartPageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaStartPage({ params }: AreaStartPageProps) {
  const { area: areaSlug } = await params;
  const { area, user } = await requireAreaFromSlug(areaSlug);
  const [brandLabel, allowedFunctions, deskRole, nameRow] = await Promise.all([
    getTenantDisplayBrand(user.tenantId),
    getUserAllowedFunctions(user.id, user.tenantId),
    getUserDeskRole(user.id, user.tenantId),
    db
      .select({
        lastName: users.lastName,
        salutation: users.salutation,
      })
      .from(users)
      .where(and(eq(users.id, user.id), eq(users.tenantId, user.tenantId)))
      .limit(1),
  ]);

  const greetingTitle = formatDeskGreeting({
    salutation: nameRow[0]?.salutation ?? null,
    lastName: nameRow[0]?.lastName ?? "",
  });

  const [dashboardStats, dashboardLists] =
    deskRole === "rechtsanwalt"
      ? await Promise.all([
          getStaffDashboardStats(user.tenantId, user.id, area),
          getStaffDashboardLists(user.tenantId, user.id, area),
        ])
      : [null, null];

  return (
    <AreaStartView
      brandLabel={brandLabel}
      area={area}
      allowedFunctions={allowedFunctions}
      userId={user.id}
      deskRole={deskRole}
      dashboardStats={dashboardStats}
      dashboardLists={dashboardLists}
      title={greetingTitle}
    />
  );
}
