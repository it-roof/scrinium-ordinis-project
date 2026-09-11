import { AuftragInboxView } from "@/components/auftraege/auftrag-inbox-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { isStaffMessagePriority } from "@/lib/staff-messages/types";
import { listBallInbox } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
  searchParams: Promise<{
    priority?: string;
    filter?: string;
    unread?: string;
    message?: string;
  }>;
};

function parseInboxFilter(raw: string | undefined): "offen" | "erledigt" | null {
  if (raw === "offen" || raw === "erledigt") {
    return raw;
  }
  return null;
}

export default async function AreaInboxPage({
  params,
  searchParams,
}: PageProps) {
  const { area: areaSlug } = await params;
  const {
    priority: priorityRaw,
    filter: filterRaw,
    unread: unreadRaw,
    message: messageRaw,
  } = await searchParams;
  const { area, user } = await requireAreaFunction(areaSlug, "inbox");
  const messages = await listBallInbox(user.tenantId, user.id, area);
  const initialPriority =
    priorityRaw && isStaffMessagePriority(priorityRaw) ? priorityRaw : null;
  const initialFilter = parseInboxFilter(filterRaw);
  const initialUnreadOnly =
    unreadRaw === "1" || unreadRaw === "true" || unreadRaw === "ungelesen";
  const initialMessageId =
    typeof messageRaw === "string" && messageRaw.trim().length > 0
      ? messageRaw.trim()
      : null;

  return (
    <AuftragInboxView
      mailbox="eingang"
      messages={messages}
      currentUserId={user.id}
      initialPriority={initialPriority}
      initialFilter={initialFilter}
      initialUnreadOnly={initialUnreadOnly}
      initialMessageId={initialMessageId}
    />
  );
}
