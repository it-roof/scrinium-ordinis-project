import { LetterForm } from "@/components/letters/letter-form";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { listLetterColleagues } from "@/lib/letters/storage";
import { isLetterKind } from "@/lib/letters/types";
import { listMattersOptions } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
  searchParams: Promise<{ kind?: string; title?: string; matter?: string }>;
};

export default async function DeskLetterCreatePage({
  params,
  searchParams,
}: PageProps) {
  const { practice: practiceSlug } = await params;
  const query = await searchParams;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "letters",
  });

  const kindParam = query.kind ?? "";
  const defaultKind = isLetterKind(kindParam) ? kindParam : undefined;
  const defaultTitle = query.title?.trim() || undefined;
  const defaultMatterId = query.matter?.trim() || undefined;
  const [colleagues, matters] = await Promise.all([
    listLetterColleagues(ctx.tenantId),
    listMattersOptions(ctx.tenantId, ctx.area),
  ]);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Schreiben erstellen">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <LetterForm
          mode="create"
          defaultKind={defaultKind}
          defaultTitle={defaultTitle}
          defaultMatterId={defaultMatterId}
          colleagues={colleagues}
          currentUserId={ctx.userId}
          matters={matters}
        />
      </div>
    </DeskAppShell>
  );
}
