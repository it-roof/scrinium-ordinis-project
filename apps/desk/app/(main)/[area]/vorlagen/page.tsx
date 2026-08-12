import { TemplatesView } from "@/components/templates/templates-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getTemplates } from "@/lib/templates/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaTemplatesPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user, area } = await requireAreaFunction(areaSlug, "templates");
  const items = await getTemplates(user.tenantId, area);

  return <TemplatesView initialItems={items} module={area} />;
}
