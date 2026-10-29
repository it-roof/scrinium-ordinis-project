import { V1PromptForm } from "@/components/desk/prompts/prompt-form";
import { PlatformShell } from "@/components/platform/platform-shell";
import { getAllPromptTagNames } from "@/lib/prompts/storage";
import { requirePlatformAdmin } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function PlatformNewPromptPage() {
  await requirePlatformAdmin();
  const availableTags = await getAllPromptTagNames();

  return (
    <PlatformShell title="Prompt erstellen" pathname="/platform/prompts">
      <V1PromptForm
        mode="create"
        libraryHref="/platform/prompts"
        availableTags={availableTags}
      />
    </PlatformShell>
  );
}
