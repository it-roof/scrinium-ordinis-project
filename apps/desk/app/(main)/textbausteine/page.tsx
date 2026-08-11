import { TextBlocksView } from "@/components/text-blocks/text-blocks-view";
import { requireTenantUser } from "@/lib/tenant/session";
import { getTextBlocks } from "@/lib/text-blocks/storage";

export const dynamic = "force-dynamic";

export default async function TextBlocksPage() {
  const user = await requireTenantUser();
  const items = await getTextBlocks(user.tenantId);

  return <TextBlocksView initialItems={items} />;
}
