import { AktenChatListView } from "@/components/ai/akten-chat-list-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { listMatterAiChats } from "@/lib/ai/matter-chat/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function AktenChatWithoutMatterPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "akten-chat",
  });

  const chats = await listMatterAiChats(ctx.tenantId, null, ctx.area);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akten-Chat">
      <AktenChatListView
        practice={ctx.area}
        matterId={null}
        matterTitle="Nicht zugeordnet"
        chats={chats}
      />
    </DeskAppShell>
  );
}
