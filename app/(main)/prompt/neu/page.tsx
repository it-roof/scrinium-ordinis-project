import { PromptForm } from "@/components/prompts/prompt-form";
import { getAllPromptTagNames } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

export default async function NewPromptPage() {
  const availableTags = await getAllPromptTagNames();

  return <PromptForm mode="create" availableTags={availableTags} />;
}
