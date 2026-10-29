import { V1PromptsLibraryView } from "@/components/desk/prompts/prompts-library-view";
import { PlatformShell } from "@/components/platform/platform-shell";
import { getPrompts } from "@/lib/prompts/storage";
import { requirePlatformAdmin } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function PlatformPromptsPage() {
  await requirePlatformAdmin();
  const items = await getPrompts();

  return (
    <PlatformShell title="Prompt-Bibliothek" pathname="/platform/prompts">
      <V1PromptsLibraryView
        initialItems={items}
        canEdit
        basePath="/platform/prompts"
      />
    </PlatformShell>
  );
}
