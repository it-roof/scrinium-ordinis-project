import { DocsShell } from "@/components/docs/docs-shell";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getDocPageTree } from "@/lib/docs/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaDocsPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "docs");
  const tree = await getDocPageTree(user.tenantId);

  return <DocsShell tree={tree} />;
}
