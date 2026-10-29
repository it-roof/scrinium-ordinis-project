import { notFound } from "next/navigation";

import { V1PromptForm } from "@/components/desk/prompts/prompt-form";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getAllPromptTagNames,
  getPromptById,
} from "@/lib/prompts/storage";
import { requirePlatformAdmin } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlatformEditPromptPage({ params }: PageProps) {
  const { id } = await params;
  await requirePlatformAdmin();

  const [prompt, availableTags] = await Promise.all([
    getPromptById(id),
    getAllPromptTagNames(),
  ]);

  if (!prompt) {
    notFound();
  }

  return (
    <PlatformShell title="Prompt bearbeiten" pathname="/platform/prompts">
      <V1PromptForm
        mode="edit"
        promptId={prompt.id}
        libraryHref="/platform/prompts"
        availableTags={availableTags}
        initialValues={{
          number: prompt.number,
          title: prompt.title,
          content: prompt.content,
          tags: prompt.tags.map((tag) => tag.name),
        }}
      />
    </PlatformShell>
  );
}
