import { AuftragInboxView } from "@/components/auftraege/auftrag-inbox-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { listBallSent } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaSentPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { area, user } = await requireAreaFunction(areaSlug, "inbox-sent");
  const messages = await listBallSent(user.tenantId, user.id, area);

  return (
    <AuftragInboxView
      mailbox="gesendet"
      messages={messages}
      currentUserId={user.id}
    />
  );
}
