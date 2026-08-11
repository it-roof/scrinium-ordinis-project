import { PromptForm } from "@/components/prompts/prompt-form";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getAllPromptTagNames } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaNewPromptPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "prompts");
  const availableTags = await getAllPromptTagNames(user.tenantId);

  return <PromptForm mode="create" availableTags={availableTags} />;
}
