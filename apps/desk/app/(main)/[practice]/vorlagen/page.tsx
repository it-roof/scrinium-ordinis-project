import { TemplatesView } from "@/components/templates/templates-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getTemplates } from "@/lib/templates/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function DeskTemplatesPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "templates",
  });
  const items = await getTemplates(ctx.tenantId, ctx.area);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Vorlagen">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <TemplatesView initialItems={items} module={ctx.area} />
      </div>
    </DeskAppShell>
  );
}
