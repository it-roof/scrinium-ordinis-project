import { notFound } from "next/navigation";

import { DocsShell } from "@/components/docs/docs-shell";
import { getDocPageBySlug, getDocPageTree } from "@/lib/docs/storage";

export const dynamic = "force-dynamic";

type DocPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DokumentationSlugPage({ params }: DocPageProps) {
  const { slug } = await params;
  const [tree, page] = await Promise.all([
    getDocPageTree(),
    getDocPageBySlug(slug),
  ]);

  if (!page) {
    notFound();
  }

  return <DocsShell tree={tree} activePage={page} />;
}
