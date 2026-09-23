import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { MatterCaseFactsAnalysisSection } from "@/components/ai/matter-case-facts-analysis-section";
import { MatterPartiesSection } from "@/components/ai/matter-parties-section";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/desk/ui/button";
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
import { practiceBasePath } from "@/lib/area/paths";
import { getMatterById } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PageProps = {
  params: Promise<{ practice: string; matterId: string }>;
};

export default async function DeskAnalyseMatterPage({ params }: PageProps) {
  const { practice: practiceSlug, matterId } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "case-facts-analysis",
  });
  const matter = await getMatterById(ctx.tenantId, matterId);
  if (!matter || matter.module !== ctx.area) {
    notFound();
  }

  const [parties, latestConsent, drafts] = await Promise.all([
    listMatterParties(ctx.tenantId, matterId),
    getLatestAiConsent(ctx.tenantId, matter.clientId),
    listAiDraftsForMatter(ctx.tenantId, matterId),
  ]);

  const analyseHref = `${practiceBasePath(ctx.area)}/analyse`;

  return (
    <DeskAppShell ctx={ctx} headerTitle="KI-Analyse">
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4 lg:p-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-fit px-0 text-muted-foreground hover:text-foreground"
        >
          <Link href={analyseHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Zurück zur Aktenauswahl
          </Link>
        </Button>

        <PageHeader
          title={matter.title}
          description={`${matter.clientName}${
            matter.reference ? ` · ${matter.reference}` : ""
          }`}
        />

        <MatterPartiesSection matterId={matter.id} initialParties={parties} />

        <MatterCaseFactsAnalysisSection
          matterId={matter.id}
          consentStatus={consentStatusView(latestConsent)}
          canApprove={ctx.deskRole === "rechtsanwalt"}
          initialDrafts={drafts}
        />
      </div>
    </DeskAppShell>
  );
}
