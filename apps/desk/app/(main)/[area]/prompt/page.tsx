import { PromptsView } from "@/components/prompts/prompts-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getPrompts } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaPromptPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "prompts");
  const items = await getPrompts(user.tenantId);

  return <PromptsView initialItems={items} />;
}
