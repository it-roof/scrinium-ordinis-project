import { PromptsView } from "@/components/prompts/prompts-view";
import { getPrompts } from "@/lib/prompts/storage";

export const dynamic = "force-dynamic";

export default async function PromptPage() {
  const items = await getPrompts();

  return <PromptsView initialItems={items} />;
}
