import { V1AufgabenView } from "@/components/v1/aufgaben/aufgaben-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { listBallSent } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

export default async function V1GesendetPage() {
  const ctx = await requireV1DeskUser({ requireFunction: "inbox-sent" });
  const messages = await listBallSent(ctx.tenantId, ctx.userId, ctx.area);

  return (
    <V1AppShell ctx={ctx} headerTitle="Meine Aufgaben">
      <V1AufgabenView
        mailbox="gesendet"
        messages={messages}
        currentUserId={ctx.userId}
      />
    </V1AppShell>
  );
}
