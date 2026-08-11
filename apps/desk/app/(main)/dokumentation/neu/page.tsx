import { DocForm } from "@/components/docs/doc-form";
import { getRootDocPages } from "@/lib/docs/storage";
import { requireTenantUser } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function NewDocPage() {
  const user = await requireTenantUser();
  const rootPages = await getRootDocPages(user.tenantId);

  return <DocForm mode="create" rootPages={rootPages} />;
}
