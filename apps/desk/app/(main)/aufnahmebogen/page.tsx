import {
  DeskAppShell,
  requireDeskUser,
} from "@/components/desk/shell/desk-app-shell";
import { IntakeListView } from "@/components/intake/intake-list-view";
import { listIntakeInvites } from "@/lib/intake/storage";

export const dynamic = "force-dynamic";

export default async function AufnahmebogenPage() {
  const ctx = await requireDeskUser({ requireFunction: "client-intake" });
  const items = await listIntakeInvites(ctx.tenantId);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Mandats-Aufnahmebogen">
      <IntakeListView initialItems={items} />
    </DeskAppShell>
  );
}
