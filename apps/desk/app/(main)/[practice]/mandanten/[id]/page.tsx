import { notFound } from "next/navigation";

import { ClientDetailView } from "@/components/clients/client-detail-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import {
  consentStatusView,
  getLatestAiConsent,
} from "@/lib/ai/consent";
import type { AiConsentView } from "@/lib/ai/consent-actions";
import { getClientById, getPersonsForClient } from "@/lib/clients/storage";
import { getMattersForClient } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string; id: string }>;
};

export default async function DeskClientDetailPage({ params }: PageProps) {
  const { practice: practiceSlug, id } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "clients",
  });
  const [client, persons, matters, latestConsent] = await Promise.all([
    getClientById(ctx.tenantId, id),
    getPersonsForClient(ctx.tenantId, id),
    getMattersForClient(ctx.tenantId, id),
    getLatestAiConsent(ctx.tenantId, id),
  ]);
  if (!client || client.module !== ctx.area) {
    notFound();
  }

  const initialConsent: AiConsentView = {
    status: consentStatusView(latestConsent),
    waiver43e: latestConsent?.waiver43e ?? false,
    grantedAt: latestConsent?.grantedAt ?? null,
    revokedAt: latestConsent?.revokedAt ?? null,
    evidence: latestConsent?.evidence ?? null,
    createdAt: latestConsent?.createdAt ?? null,
  };

  return (
    <DeskAppShell ctx={ctx} headerTitle="Mandant">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <ClientDetailView
          client={client}
          initialPersons={persons}
          initialMatters={matters}
          initialConsent={initialConsent}
        />
      </div>
    </DeskAppShell>
  );
}
