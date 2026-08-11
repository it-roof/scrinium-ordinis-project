import { notFound } from "next/navigation";

import { DocsShell } from "@/components/docs/docs-shell";
import { getDocPageBySlug, getDocPageTree } from "@/lib/docs/storage";
import { requireTenantUser } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

type DocPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DokumentationSlugPage({ params }: DocPageProps) {
  const user = await requireTenantUser();
  const { slug } = await params;
  const [tree, page] = await Promise.all([
    getDocPageTree(user.tenantId),
    getDocPageBySlug(user.tenantId, slug),
  ]);

  if (!page) {
    notFound();
  }

  return <DocsShell tree={tree} activePage={page} />;
}
