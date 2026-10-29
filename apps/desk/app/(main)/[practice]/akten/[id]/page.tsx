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
import { listMatterAiChats } from "@/lib/ai/matter-chat/storage";
import { listMatterParties } from "@/lib/ai/parties-storage";
import { listMatterFiles } from "@/lib/matters/files-storage";
import { getLetters } from "@/lib/letters/storage";
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

  const canAktenChat =
    ctx.allowedFunctions === null ||
    ctx.allowedFunctions.includes("akten-chat");

  const canLetters =
    ctx.allowedFunctions === null ||
    ctx.allowedFunctions.includes("letters");

  const [parties, latestConsent, chats, letters, files] = await Promise.all([
    listMatterParties(ctx.tenantId, id),
    getLatestAiConsent(ctx.tenantId, matter.clientId),
    canAktenChat
      ? listMatterAiChats(ctx.tenantId, id, ctx.area)
      : Promise.resolve([]),
    canLetters
      ? getLetters(ctx.tenantId, ctx.area, id)
      : Promise.resolve([]),
    listMatterFiles(ctx.tenantId, id, ctx.area),
  ]);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akte">
      <MatterDetailView
        matter={matter}
        letters={letters}
        showLetters={canLetters}
        files={files}
        parties={parties}
        consentStatus={consentStatusView(latestConsent)}
        chats={chats}
      />
    </DeskAppShell>
  );
}
