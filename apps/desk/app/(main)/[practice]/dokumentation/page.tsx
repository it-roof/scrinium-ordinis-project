import { DocsShell } from "@/components/docs/docs-shell";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getDocPageTree, getDocTags } from "@/lib/docs/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function DeskDocsPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "docs",
  });
  const [tree, knownTags] = await Promise.all([
    getDocPageTree(ctx.tenantId, [ctx.area]),
    getDocTags(ctx.tenantId),
  ]);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Dokumentation">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <DocsShell tree={tree} knownTags={knownTags} />
      </div>
    </DeskAppShell>
  );
}
