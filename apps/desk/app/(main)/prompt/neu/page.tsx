import { PromptForm } from "@/components/prompts/prompt-form";
import { getAllPromptTagNames } from "@/lib/prompts/storage";
import { requireTenantUser } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function NewPromptPage() {
  const user = await requireTenantUser();
  const availableTags = await getAllPromptTagNames(user.tenantId);

  return <PromptForm mode="create" availableTags={availableTags} />;
}
