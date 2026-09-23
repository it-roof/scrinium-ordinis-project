import { KiChatView } from "@/components/ai/ki-chat-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function KiChatPage() {
  const ctx = await requireDeskUser({ requireFunction: "ai-chat" });

  return (
    <DeskAppShell ctx={ctx} headerTitle="KI">
      <KiChatView practiceArea={ctx.area} />
    </DeskAppShell>
  );
}
