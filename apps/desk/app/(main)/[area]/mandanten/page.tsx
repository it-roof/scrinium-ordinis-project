import { ClientsView } from "@/components/clients/clients-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getClients } from "@/lib/clients/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaClientsPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "clients");
  const items = await getClients(user.tenantId, "legal");

  return <ClientsView initialItems={items} />;
}
