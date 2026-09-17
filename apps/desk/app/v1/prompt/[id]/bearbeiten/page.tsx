import { notFound, redirect } from "next/navigation";

import { V1PromptForm } from "@/components/v1/prompts/prompt-form";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { canManagePromptCatalog } from "@/lib/prompts/catalog";
import { getAllPromptTagNames, getPromptById } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1EditPromptPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireV1DeskUser({ requireFunction: "prompts" });
  if (!(await canManagePromptCatalog(ctx.tenantId))) {
    redirect("/v1/prompt");
  }

  const [prompt, availableTags] = await Promise.all([
    getPromptById(id),
    getAllPromptTagNames(),
  ]);

  if (!prompt) {
    notFound();
  }

  return (
    <V1AppShell ctx={ctx} headerTitle="Prompt bearbeiten">
      <V1PromptForm
        mode="edit"
        promptId={prompt.id}
        availableTags={availableTags}
        initialValues={{
          number: prompt.number,
          title: prompt.title,
          content: prompt.content,
          tags: prompt.tags.map((tag) => tag.name),
        }}
      />
    </V1AppShell>
  );
}
