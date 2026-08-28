import { MattersView } from "@/components/matters/matters-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getMatters } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaMattersPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "matters");
  const items = await getMatters(user.tenantId, "legal");

  return <MattersView initialItems={items} />;
}
