import { redirect } from "next/navigation";

import { V1PromptsLibraryView } from "@/components/desk/prompts/prompts-library-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { canManagePromptCatalog } from "@/lib/prompts/catalog";
import { getPrompts } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function V1PromptPage({ searchParams }: PageProps) {
  const ctx = await requireDeskUser({ requireFunction: "prompts" });
  const { mode: modeRaw } = await searchParams;
  const canManage = await canManagePromptCatalog(ctx.tenantId);
  const mode =
    modeRaw === "verwalten" && canManage ? "verwalten" : "ansehen";

  if (modeRaw === "verwalten" && !canManage) {
    redirect("/prompt");
  }

  const items = await getPrompts();

  return (
    <DeskAppShell ctx={ctx} headerTitle="Prompt-Bibliothek">
      <V1PromptsLibraryView
        initialItems={items}
        mode={mode}
        canManage={canManage}
      />
    </DeskAppShell>
  );
}
