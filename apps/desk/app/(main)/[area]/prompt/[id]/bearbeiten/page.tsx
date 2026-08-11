import { notFound } from "next/navigation";

import { PromptForm } from "@/components/prompts/prompt-form";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getAllPromptTagNames, getPromptById } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string; id: string }>;
};

export default async function AreaEditPromptPage({ params }: PageProps) {
  const { area: areaSlug, id } = await params;
  const { user } = await requireAreaFunction(areaSlug, "prompts");
  const [prompt, availableTags] = await Promise.all([
    getPromptById(user.tenantId, id),
    getAllPromptTagNames(user.tenantId),
  ]);

  if (!prompt) {
    notFound();
  }

  return (
    <PromptForm
      mode="edit"
      promptId={prompt.id}
      availableTags={availableTags}
      initialValues={{
        title: prompt.title,
        content: prompt.content,
        tags: prompt.tags.map((tag) => tag.name),
      }}
    />
  );
}
