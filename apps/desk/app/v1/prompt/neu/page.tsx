import { redirect } from "next/navigation";

import { V1PromptForm } from "@/components/v1/prompts/prompt-form";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { canManagePromptCatalog } from "@/lib/prompts/catalog";
import { getAllPromptTagNames } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

export default async function V1NewPromptPage() {
  const ctx = await requireV1DeskUser({ requireFunction: "prompts" });
  if (!(await canManagePromptCatalog(ctx.tenantId))) {
    redirect("/v1/prompt");
  }

  const availableTags = await getAllPromptTagNames();

  return (
    <V1AppShell ctx={ctx} headerTitle="Neuer Prompt">
      <V1PromptForm mode="create" availableTags={availableTags} />
    </V1AppShell>
  );
}
