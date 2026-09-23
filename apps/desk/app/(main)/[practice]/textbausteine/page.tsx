import { ActiveAreaProvider } from "@/components/layout/active-area-provider";
import { TextBlocksView } from "@/components/text-blocks/text-blocks-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getUserEffectiveModules } from "@/lib/tenant/modules";
import {
  getAllTextBlockTagNames,
  getTextBlocks,
} from "@/lib/text-blocks/storage";
import { filterModulesForEnabled } from "@/lib/text-blocks/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function DeskTextBlocksPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "text-blocks",
  });
  const enabledModules = await getUserEffectiveModules(
    ctx.userId,
    ctx.tenantId
  );
  const [items, tagSuggestions] = await Promise.all([
    getTextBlocks(ctx.tenantId, ["general", ctx.area]),
    getAllTextBlockTagNames(ctx.tenantId),
  ]);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Textbausteine">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <ActiveAreaProvider
          initialActiveArea={ctx.area}
          allowedAreas={enabledModules}
        >
          <TextBlocksView
            initialItems={items}
            modules={filterModulesForEnabled(enabledModules)}
            tagSuggestions={tagSuggestions}
          />
        </ActiveAreaProvider>
      </div>
    </DeskAppShell>
  );
}
