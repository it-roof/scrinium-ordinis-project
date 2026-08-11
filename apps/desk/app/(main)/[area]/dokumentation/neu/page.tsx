import { DocForm } from "@/components/docs/doc-form";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getRootDocPages } from "@/lib/docs/storage";
import { filterModulesForEnabled } from "@/lib/text-blocks/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaNewDocPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user, enabledModules } = await requireAreaFunction(areaSlug, "docs");
  const rootPages = await getRootDocPages(user.tenantId);

  return (
    <DocForm
      mode="create"
      rootPages={rootPages}
      modules={filterModulesForEnabled(enabledModules)}
    />
  );
}
