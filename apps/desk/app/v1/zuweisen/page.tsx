import { V1AufgabenComposeView } from "@/components/v1/aufgaben/aufgaben-compose-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { listMattersOptions } from "@/lib/matters/storage";
import { listStaffColleagues } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

export default async function V1ZuweisenPage() {
  const ctx = await requireV1DeskUser({
    requireFunction: "staff-messages",
  });

  const [colleagues, matterRows] = await Promise.all([
    listStaffColleagues(ctx.tenantId, ctx.userId),
    listMattersOptions(ctx.tenantId, ctx.area),
  ]);

  const matters = matterRows.map((row) => ({
    id: row.id,
    title: row.title,
    clientName: row.clientName,
    reference: row.reference,
  }));

  return (
    <V1AppShell ctx={ctx} headerTitle="Aufgabe zuweisen">
      <V1AufgabenComposeView
        colleagues={colleagues}
        matters={matters}
        module={ctx.area}
        currentUserId={ctx.userId}
      />
    </V1AppShell>
  );
}
