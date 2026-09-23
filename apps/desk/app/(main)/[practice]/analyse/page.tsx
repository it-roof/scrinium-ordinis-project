import { PageHeader } from "@/components/layout/page-header";
import { AnalyseMatterPicker } from "@/components/ai/analyse-matter-picker";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import {
  consentStatusView,
  getLatestAiConsent,
} from "@/lib/ai/consent";
import { practiceBasePath } from "@/lib/area/paths";
import { getMatters } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function DeskAnalysePage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "case-facts-analysis",
  });
  const matters = await getMatters(ctx.tenantId, ctx.area);
  const basePath = practiceBasePath(ctx.area);

  const withConsent = await Promise.all(
    matters.map(async (matter) => {
      const latest = await getLatestAiConsent(ctx.tenantId, matter.clientId);
      return {
        ...matter,
        consentGranted: consentStatusView(latest) === "granted",
      };
    })
  );

  return (
    <DeskAppShell ctx={ctx} headerTitle="KI-Analyse">
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4 lg:p-6">
        <PageHeader
          title="KI-Analyse"
          description="Akte wählen — Sachverhalt analysieren lassen und Entwurf prüfen."
        />
        <AnalyseMatterPicker matters={withConsent} basePath={basePath} />
      </div>
    </DeskAppShell>
  );
}
