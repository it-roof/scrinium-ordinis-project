import { notFound, redirect } from "next/navigation";

import { V1PromptForm } from "@/components/desk/prompts/prompt-form";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { canManagePromptCatalog } from "@/lib/prompts/catalog";
import { getAllPromptTagNames, getPromptById } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1EditPromptPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireDeskUser({ requireFunction: "prompts" });
  if (!(await canManagePromptCatalog(ctx.tenantId))) {
    redirect("/prompt");
  }

  const [prompt, availableTags] = await Promise.all([
    getPromptById(id),
    getAllPromptTagNames(),
  ]);

  if (!prompt) {
    notFound();
  }

  return (
    <DeskAppShell ctx={ctx} headerTitle="Prompt bearbeiten">
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
    </DeskAppShell>
  );
}
