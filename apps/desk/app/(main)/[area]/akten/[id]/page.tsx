import { notFound } from "next/navigation";

import { MatterDetailView } from "@/components/matters/matter-detail-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getLetters } from "@/lib/letters/storage";
import { getMatterById } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string; id: string }>;
};

export default async function AreaMatterDetailPage({ params }: PageProps) {
  const { area: areaSlug, id } = await params;
  const { user } = await requireAreaFunction(areaSlug, "matters");
  const matter = await getMatterById(user.tenantId, id);
  if (!matter) {
    notFound();
  }
  const letters = await getLetters(user.tenantId, "legal", matter.id);

  return <MatterDetailView matter={matter} letters={letters} />;
}
