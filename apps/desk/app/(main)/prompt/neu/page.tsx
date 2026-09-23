import { redirect } from "next/navigation";

import { V1PromptForm } from "@/components/desk/prompts/prompt-form";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { canManagePromptCatalog } from "@/lib/prompts/catalog";
import { getAllPromptTagNames } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

export default async function V1NewPromptPage() {
  const ctx = await requireDeskUser({ requireFunction: "prompts" });
  if (!(await canManagePromptCatalog(ctx.tenantId))) {
    redirect("/prompt");
  }

  const availableTags = await getAllPromptTagNames();

  return (
    <DeskAppShell ctx={ctx} headerTitle="Neuer Prompt">
      <V1PromptForm mode="create" availableTags={availableTags} />
    </DeskAppShell>
  );
}
