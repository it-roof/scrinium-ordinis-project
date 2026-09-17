import { redirect } from "next/navigation";

import { V1PromptsLibraryView } from "@/components/v1/prompts/prompts-library-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { canManagePromptCatalog } from "@/lib/prompts/catalog";
import { getPrompts } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function V1PromptPage({ searchParams }: PageProps) {
  const ctx = await requireV1DeskUser({ requireFunction: "prompts" });
  const { mode: modeRaw } = await searchParams;
  const canManage = await canManagePromptCatalog(ctx.tenantId);
  const mode =
    modeRaw === "verwalten" && canManage ? "verwalten" : "ansehen";

  if (modeRaw === "verwalten" && !canManage) {
    redirect("/v1/prompt");
  }

  const items = await getPrompts();

  return (
    <V1AppShell ctx={ctx} headerTitle="Prompt-Bibliothek">
      <V1PromptsLibraryView
        initialItems={items}
        mode={mode}
        canManage={canManage}
      />
    </V1AppShell>
  );
}
