import { V1PromptsLibraryView } from "@/components/v1/prompts/prompts-library-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { getAllPromptTagNames, getPrompts } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function V1PromptPage({ searchParams }: PageProps) {
  const ctx = await requireV1DeskUser({ requireFunction: "prompts" });
  const { mode: modeRaw } = await searchParams;
  const mode = modeRaw === "verwalten" ? "verwalten" : "ansehen";
  const [items, availableTags] = await Promise.all([
    getPrompts(ctx.tenantId),
    getAllPromptTagNames(ctx.tenantId),
  ]);

  return (
    <V1AppShell ctx={ctx} headerTitle="Prompt-Bibliothek">
      <V1PromptsLibraryView
        initialItems={items}
        availableTags={availableTags}
        mode={mode}
      />
    </V1AppShell>
  );
}
