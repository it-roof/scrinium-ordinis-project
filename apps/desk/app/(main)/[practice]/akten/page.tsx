import { MattersView } from "@/components/matters/matters-view";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { listMatterAiChats } from "@/lib/ai/matter-chat/storage";
import { getClients } from "@/lib/clients/storage";
import { formatClientName } from "@/lib/clients/types";
import { getMatters } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function DeskMattersPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "matters",
  });

  const canAktenChat =
    ctx.allowedFunctions === null ||
    ctx.allowedFunctions.includes("akten-chat");

  const [items, clients, unassignedChats] = await Promise.all([
    getMatters(ctx.tenantId, ctx.area),
    getClients(ctx.tenantId, ctx.area),
    canAktenChat
      ? listMatterAiChats(ctx.tenantId, null, ctx.area)
      : Promise.resolve([]),
  ]);

  const clientOptions = clients
    .map((client) => ({
      id: client.id,
      name: formatClientName(client),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akten">
      <MattersView
        initialItems={items}
        clients={clientOptions}
        unassignedChats={unassignedChats}
        canAktenChat={canAktenChat}
      />
    </DeskAppShell>
  );
}
