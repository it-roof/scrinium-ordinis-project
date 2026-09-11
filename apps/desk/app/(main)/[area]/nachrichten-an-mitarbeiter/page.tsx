import { AuftragComposeView } from "@/components/auftraege/auftrag-compose-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { listMattersOptions } from "@/lib/matters/storage";
import { listStaffColleagues } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaStaffMessagesPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user, area } = await requireAreaFunction(areaSlug, "staff-messages");

  const [colleagues, matterRows] = await Promise.all([
    listStaffColleagues(user.tenantId, user.id),
    listMattersOptions(user.tenantId, area),
  ]);

  const matters = matterRows.map((row) => ({
    id: row.id,
    title: row.title,
    clientName: row.clientName,
    reference: row.reference,
  }));

  return (
    <AuftragComposeView
      colleagues={colleagues}
      matters={matters}
      module={area}
      currentUserId={user.id}
    />
  );
}
