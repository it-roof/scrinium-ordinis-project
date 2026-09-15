import { notFound } from "next/navigation";

import { ClientDetailView } from "@/components/clients/client-detail-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { getClientById, getPersonsForClient } from "@/lib/clients/storage";
import { getMattersForClient } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireV1DeskUser({ requireFunction: "clients" });
  const [client, persons, matters] = await Promise.all([
    getClientById(ctx.tenantId, id),
    getPersonsForClient(ctx.tenantId, id),
    getMattersForClient(ctx.tenantId, id),
  ]);
  if (!client) {
    notFound();
  }

  return (
    <V1AppShell ctx={ctx} headerTitle="Mandant">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <ClientDetailView
          client={client}
          initialPersons={persons}
          initialMatters={matters}
        />
      </div>
    </V1AppShell>
  );
}
