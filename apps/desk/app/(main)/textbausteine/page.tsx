import { TextBlocksView } from "@/components/text-blocks/text-blocks-view";
import { getTextBlocks } from "@/lib/text-blocks/storage";

export const dynamic = "force-dynamic";

export default async function TextBlocksPage() {
  const items = await getTextBlocks();

  return <TextBlocksView initialItems={items} />;
}
