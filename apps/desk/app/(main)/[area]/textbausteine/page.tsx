import { TextBlocksView } from "@/components/text-blocks/text-blocks-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import {
  getAllTextBlockTagNames,
  getTextBlocks,
} from "@/lib/text-blocks/storage";
import { filterModulesForEnabled } from "@/lib/text-blocks/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaTextBlocksPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user, enabledModules, area } = await requireAreaFunction(
    areaSlug,
    "text-blocks"
  );
  const [items, tagSuggestions] = await Promise.all([
    getTextBlocks(user.tenantId, ["general", area]),
    getAllTextBlockTagNames(user.tenantId),
  ]);

  return (
    <TextBlocksView
      initialItems={items}
      modules={filterModulesForEnabled(enabledModules)}
      tagSuggestions={tagSuggestions}
    />
  );
}
