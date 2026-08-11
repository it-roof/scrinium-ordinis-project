import { PromptsView } from "@/components/prompts/prompts-view";
import { getPrompts } from "@/lib/prompts/storage";
import { requireTenantUser } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function PromptPage() {
  const user = await requireTenantUser();
  const items = await getPrompts(user.tenantId);

  return <PromptsView initialItems={items} />;
}
