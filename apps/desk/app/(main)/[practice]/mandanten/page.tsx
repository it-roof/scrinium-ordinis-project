import { ClientsView } from "@/components/clients/clients-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getClients } from "@/lib/clients/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function DeskClientsPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "clients",
  });
  const items = await getClients(ctx.tenantId, ctx.area);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Mandanten">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <ClientsView initialItems={items} />
      </div>
    </DeskAppShell>
  );
}
