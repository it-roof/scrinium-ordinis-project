import { notFound } from "next/navigation";

import { AktenChatThreadView } from "@/components/ai/akten-chat-thread-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getMatterAiChatDetail } from "@/lib/ai/matter-chat/storage";
import { listMattersOptions } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type PageProps = {
  params: Promise<{ practice: string; chatId: string }>;
};

export default async function AktenChatWithoutMatterThreadPage({
  params,
}: PageProps) {
  const { practice: practiceSlug, chatId } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "akten-chat",
  });

  const chat = await getMatterAiChatDetail({
    tenantId: ctx.tenantId,
    chatId,
    module: ctx.area,
  });
  if (!chat || chat.matterId != null) {
    notFound();
  }

  const matterOptions = await listMattersOptions(ctx.tenantId, ctx.area);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akten-Chat">
      <AktenChatThreadView
        practice={ctx.area}
        matterId={null}
        chatId={chat.id}
        chatTitle={chat.title}
        initialMessages={chat.messages}
        initialLetterId={chat.letterId}
        consentGranted={false}
        matterOptions={matterOptions}
      />
    </DeskAppShell>
  );
}
