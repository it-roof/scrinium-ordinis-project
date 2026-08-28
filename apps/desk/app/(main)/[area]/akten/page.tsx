import { MattersView } from "@/components/matters/matters-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getClients } from "@/lib/clients/storage";
import { formatClientName } from "@/lib/clients/types";
import { getMatters } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaMattersPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "matters");
  const [items, clients] = await Promise.all([
    getMatters(user.tenantId, "legal"),
    getClients(user.tenantId, "legal"),
  ]);

  const clientOptions = clients
    .map((client) => ({
      id: client.id,
      name: formatClientName(client),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return <MattersView initialItems={items} clients={clientOptions} />;
}
