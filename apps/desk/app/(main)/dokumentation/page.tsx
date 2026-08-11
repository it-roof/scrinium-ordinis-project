import { DocsShell } from "@/components/docs/docs-shell";
import { getDocPageTree } from "@/lib/docs/storage";
import { requireTenantUser } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function DokumentationPage() {
  const user = await requireTenantUser();
  const tree = await getDocPageTree(user.tenantId);

  return <DocsShell tree={tree} />;
}
