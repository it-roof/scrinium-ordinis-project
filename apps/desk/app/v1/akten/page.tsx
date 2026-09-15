import { MattersView } from "@/components/matters/matters-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { getClients } from "@/lib/clients/storage";
import { formatClientName } from "@/lib/clients/types";
import { getMatters } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

export default async function V1MattersPage() {
  const ctx = await requireV1DeskUser({ requireFunction: "matters" });
  const [items, clients] = await Promise.all([
    getMatters(ctx.tenantId, ctx.area),
    getClients(ctx.tenantId, ctx.area),
  ]);

  const clientOptions = clients
    .map((client) => ({
      id: client.id,
      name: formatClientName(client),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <V1AppShell ctx={ctx} headerTitle="Akten">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <MattersView initialItems={items} clients={clientOptions} />
      </div>
    </V1AppShell>
  );
}
