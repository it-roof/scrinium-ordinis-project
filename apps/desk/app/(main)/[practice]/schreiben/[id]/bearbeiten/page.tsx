import { notFound } from "next/navigation";

import { LetterForm } from "@/components/letters/letter-form";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getLetterById, listLetterColleagues } from "@/lib/letters/storage";
import { listMattersOptions } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string; id: string }>;
  searchParams: Promise<{ delegieren?: string }>;
};

export default async function DeskLetterEditPage({
  params,
  searchParams,
}: PageProps) {
  const { practice: practiceSlug, id } = await params;
  const query = await searchParams;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "letters",
  });
  const [letter, colleagues, matters] = await Promise.all([
    getLetterById(ctx.tenantId, id),
    listLetterColleagues(ctx.tenantId),
    listMattersOptions(ctx.tenantId, ctx.area),
  ]);
  if (!letter) {
    notFound();
  }

  return (
    <DeskAppShell ctx={ctx} headerTitle="Schreiben bearbeiten">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <LetterForm
          mode="edit"
          letterId={letter.id}
          initialValues={letter}
          colleagues={colleagues}
          currentUserId={ctx.userId}
          matters={matters}
          openDelegateFork={query.delegieren === "1"}
        />
      </div>
    </DeskAppShell>
  );
}
