import { MessagesOverviewView } from "@/components/inbox/messages-overview-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { listStaffMessages } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaMessagesOverviewPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { area, user } = await requireAreaFunction(
    areaSlug,
    "inbox-overview"
  );
  const messages = await listStaffMessages(user.tenantId, user.id, area);

  return (
    <MessagesOverviewView messages={messages} currentUserId={user.id} />
  );
}
