import { notFound } from "next/navigation";

import { ClientDetailView } from "@/components/clients/client-detail-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getClientById, getPersonsForClient } from "@/lib/clients/storage";
import { getMattersForClient } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string; id: string }>;
};

export default async function AreaClientDetailPage({ params }: PageProps) {
  const { area: areaSlug, id } = await params;
  const { user } = await requireAreaFunction(areaSlug, "clients");
  const [client, persons, matters] = await Promise.all([
    getClientById(user.tenantId, id),
    getPersonsForClient(user.tenantId, id),
    getMattersForClient(user.tenantId, id),
  ]);
  if (!client) {
    notFound();
  }

  return (
    <ClientDetailView
      client={client}
      initialPersons={persons}
      initialMatters={matters}
    />
  );
}
