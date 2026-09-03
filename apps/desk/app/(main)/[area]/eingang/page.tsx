import { InboxView } from "@/components/inbox/inbox-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { listOpenStaffMessagesForRecipient } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaInboxPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { area, user } = await requireAreaFunction(areaSlug, "inbox");
  const receivedMessages = await listOpenStaffMessagesForRecipient(
    user.tenantId,
    user.id,
    area
  );

  return (
    <InboxView
      receivedMessages={receivedMessages}
      currentUserId={user.id}
    />
  );
}
