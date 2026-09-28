import { notFound } from "next/navigation";

import { AktenChatThreadView } from "@/components/ai/akten-chat-thread-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import {
  consentStatusView,
  getLatestAiConsent,
} from "@/lib/ai/consent";
import { getMatterAiChatDetail } from "@/lib/ai/matter-chat/storage";
import { getMatterById } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type PageProps = {
  params: Promise<{ practice: string; matterId: string; chatId: string }>;
};

export default async function AktenChatThreadPage({ params }: PageProps) {
  const { practice: practiceSlug, matterId, chatId } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "akten-chat",
  });

  const matter = await getMatterById(ctx.tenantId, matterId);
  if (!matter || matter.module !== ctx.area) {
    notFound();
  }

  const chat = await getMatterAiChatDetail({
    tenantId: ctx.tenantId,
    chatId,
    module: ctx.area,
  });
  if (!chat || chat.matterId !== matterId) {
    notFound();
  }

  const latestConsent = await getLatestAiConsent(
    ctx.tenantId,
    matter.clientId
  );
  const consentGranted = consentStatusView(latestConsent) === "granted";

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akten-Chat">
      <AktenChatThreadView
        practice={ctx.area}
        matterId={matter.id}
        matterTitle={matter.title}
        chatId={chat.id}
        chatTitle={chat.title}
        initialMessages={chat.messages}
        consentGranted={consentGranted}
      />
    </DeskAppShell>
  );
}
