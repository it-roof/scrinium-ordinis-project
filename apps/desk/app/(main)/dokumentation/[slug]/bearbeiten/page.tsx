import { notFound } from "next/navigation";

import { DocForm } from "@/components/docs/doc-form";
import { getDocPageBySlug, getRootDocPages } from "@/lib/docs/storage";
import { requireTenantUser } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

type EditDocPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditDocPage({ params }: EditDocPageProps) {
  const user = await requireTenantUser();
  const { slug } = await params;
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
      initialValues={{
        title: page.title,
        content: page.content,
        department: page.department,
        parentId: page.parentId,
      }}
    />
  );
}
