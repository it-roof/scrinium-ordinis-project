import { InboxView } from "@/components/inbox/inbox-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { listStaffMessagesForSender } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaSentPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { area, user } = await requireAreaFunction(areaSlug, "inbox-sent");
  const delegatedMessages = await listStaffMessagesForSender(
    user.tenantId,
    user.id,
    area
  );

  return (
    <InboxView
      mailbox="gesendet"
      delegatedMessages={delegatedMessages}
      currentUserId={user.id}
    />
  );
}
