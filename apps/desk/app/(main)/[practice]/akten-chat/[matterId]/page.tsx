import { notFound } from "next/navigation";

import { AktenChatListView } from "@/components/ai/akten-chat-list-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { listMatterAiChats } from "@/lib/ai/matter-chat/storage";
import { getMatterById } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string; matterId: string }>;
};

export default async function AktenChatMatterPage({ params }: PageProps) {
  const { practice: practiceSlug, matterId } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "akten-chat",
  });

  const matter = await getMatterById(ctx.tenantId, matterId);
  if (!matter || matter.module !== ctx.area) {
    notFound();
  }

  const chats = await listMatterAiChats(ctx.tenantId, matterId, ctx.area);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akten-Chat">
      <AktenChatListView
        practice={ctx.area}
        matterId={matter.id}
        matterTitle={matter.title}
        clientName={matter.clientName}
        chats={chats}
      />
    </DeskAppShell>
  );
}
