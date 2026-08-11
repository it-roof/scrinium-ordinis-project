import { notFound } from "next/navigation";

import { DocsShell } from "@/components/docs/docs-shell";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getDocPageBySlug, getDocPageTree } from "@/lib/docs/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string; slug: string }>;
};

export default async function AreaDocSlugPage({ params }: PageProps) {
  const { area: areaSlug, slug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "docs");
  const [tree, page] = await Promise.all([
    getDocPageTree(user.tenantId),
    getDocPageBySlug(user.tenantId, slug),
  ]);

  if (!page) {
    notFound();
  }

  return <DocsShell tree={tree} activePage={page} />;
}
