import { AreaStartView } from "@/components/home/area-start-view";
import { requireAreaFromSlug } from "@/lib/area/require-function";
import { countInboxItems } from "@/lib/letters/storage";
import { getTenantDisplayBrand } from "@/lib/tenant/brand";
import { getUserAllowedFunctions } from "@/lib/tenant/modules";

export const dynamic = "force-dynamic";

type AreaStartPageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaStartPage({ params }: AreaStartPageProps) {
  const { area: areaSlug } = await params;
  const { area, user } = await requireAreaFromSlug(areaSlug);
  const [brandLabel, inboxCount, allowedFunctions] = await Promise.all([
    getTenantDisplayBrand(user.tenantId),
    countInboxItems(user.tenantId, user.id, area),
    getUserAllowedFunctions(user.id, user.tenantId),
  ]);

  return (
    <AreaStartView
      brandLabel={brandLabel}
      area={area}
      inboxCount={inboxCount}
      allowedFunctions={allowedFunctions}
      userId={user.id}
    />
  );
}
