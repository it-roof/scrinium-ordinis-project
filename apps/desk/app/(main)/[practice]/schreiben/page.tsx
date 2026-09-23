import { LettersView } from "@/components/letters/letters-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getLetters } from "@/lib/letters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function DeskLettersPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "letters",
  });
  const items = await getLetters(ctx.tenantId, ctx.area);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Schreiben">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <LettersView initialItems={items} currentUserId={ctx.userId} />
      </div>
    </DeskAppShell>
  );
}
