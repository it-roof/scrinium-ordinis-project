import { AreaStartView } from "@/components/home/area-start-view";
import { requireAreaFromSlug } from "@/lib/area/require-function";
import { getTenantDisplayBrand } from "@/lib/tenant/brand";

export const dynamic = "force-dynamic";

type AreaStartPageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaStartPage({ params }: AreaStartPageProps) {
  const { area: areaSlug } = await params;
  const { area, user } = await requireAreaFromSlug(areaSlug);
  const brandLabel = await getTenantDisplayBrand(user.tenantId);

  return <AreaStartView brandLabel={brandLabel} area={area} />;
}
