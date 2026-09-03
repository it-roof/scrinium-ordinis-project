import { PromptsManageView } from "@/components/prompts/prompts-manage-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import {
  getPrompts,
  listPromptTagsWithCounts,
} from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaPromptManagePage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "prompts");
  const [items, initialTags] = await Promise.all([
    getPrompts(user.tenantId),
    listPromptTagsWithCounts(user.tenantId),
  ]);

  return (
    <PromptsManageView initialItems={items} initialTags={initialTags} />
  );
}
