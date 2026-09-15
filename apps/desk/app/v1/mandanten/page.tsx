import { ClientsView } from "@/components/clients/clients-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { getClients } from "@/lib/clients/storage";

export const dynamic = "force-dynamic";

export default async function V1ClientsPage() {
  const ctx = await requireV1DeskUser({ requireFunction: "clients" });
  const items = await getClients(ctx.tenantId, ctx.area);

  return (
    <V1AppShell ctx={ctx} headerTitle="Mandanten">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <ClientsView initialItems={items} />
      </div>
    </V1AppShell>
  );
}
