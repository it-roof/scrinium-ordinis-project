import { notFound } from "next/navigation";

import { DocForm } from "@/components/docs/doc-form";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getDocPageBySlug, getRootDocPages } from "@/lib/docs/storage";
import { filterModulesForEnabled } from "@/lib/text-blocks/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string; slug: string }>;
};

export default async function AreaEditDocPage({ params }: PageProps) {
  const { area: areaSlug, slug } = await params;
  const { user, enabledModules } = await requireAreaFunction(areaSlug, "docs");
  const [page, rootPages] = await Promise.all([
    getDocPageBySlug(user.tenantId, slug),
    getRootDocPages(user.tenantId),
  ]);

  if (!page) {
    notFound();
  }

  return (
    <DocForm
      mode="edit"
      pageId={page.id}
      currentSlug={page.slug}
      rootPages={rootPages}
      modules={filterModulesForEnabled(enabledModules)}
      initialValues={{
        title: page.title,
        content: page.content,
        module: page.module,
        parentId: page.parentId,
      }}
    />
  );
}
