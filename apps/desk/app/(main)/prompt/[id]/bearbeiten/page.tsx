import { notFound } from "next/navigation";

import { PromptForm } from "@/components/prompts/prompt-form";
import { getAllPromptTagNames, getPromptById } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type EditPromptPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPromptPage({ params }: EditPromptPageProps) {
  const { id } = await params;
  const [prompt, availableTags] = await Promise.all([
    getPromptById(id),
    getAllPromptTagNames(),
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
