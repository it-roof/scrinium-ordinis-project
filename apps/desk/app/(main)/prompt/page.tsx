import { V1PromptsLibraryView } from "@/components/desk/prompts/prompts-library-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getPrompts } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

export default async function V1PromptPage() {
  const ctx = await requireDeskUser({ requireFunction: "prompts" });
  const items = await getPrompts();

  return (
    <DeskAppShell ctx={ctx} headerTitle="Prompt-Bibliothek">
      <V1PromptsLibraryView initialItems={items} />
    </DeskAppShell>
  );
}
