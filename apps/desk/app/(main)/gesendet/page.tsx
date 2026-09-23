import { V1AufgabenView } from "@/components/desk/aufgaben/aufgaben-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { listBallSent } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

export default async function V1GesendetPage() {
  const ctx = await requireDeskUser({ requireFunction: "inbox-sent" });
  const messages = await listBallSent(ctx.tenantId, ctx.userId, ctx.area);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Meine Aufgaben">
      <V1AufgabenView
        mailbox="gesendet"
        messages={messages}
        currentUserId={ctx.userId}
      />
    </DeskAppShell>
  );
}
