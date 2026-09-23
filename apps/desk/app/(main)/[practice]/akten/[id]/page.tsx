import { notFound } from "next/navigation";

import { MatterDetailView } from "@/components/matters/matter-detail-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import {
  consentStatusView,
  getLatestAiConsent,
} from "@/lib/ai/consent";
import { listAiDraftsForMatter } from "@/lib/ai/drafts-storage";
import { listMatterParties } from "@/lib/ai/parties-storage";
import { getMatterById } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PageProps = {
  params: Promise<{ practice: string; id: string }>;
};

export default async function DeskMatterDetailPage({ params }: PageProps) {
  const { practice: practiceSlug, id } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "matters",
  });
  const matter = await getMatterById(ctx.tenantId, id);
  if (!matter || matter.module !== ctx.area) {
    notFound();
  }

  const [parties, latestConsent, drafts] = await Promise.all([
    listMatterParties(ctx.tenantId, id),
    getLatestAiConsent(ctx.tenantId, matter.clientId),
    listAiDraftsForMatter(ctx.tenantId, id),
  ]);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akte">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <MatterDetailView
          matter={matter}
          letters={[]}
          showLetters={false}
          parties={parties}
          consentStatus={consentStatusView(latestConsent)}
          canApprove={ctx.deskRole === "rechtsanwalt"}
          drafts={drafts}
        />
      </div>
    </DeskAppShell>
  );
}
