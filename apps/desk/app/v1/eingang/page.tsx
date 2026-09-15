import { V1AufgabenView } from "@/components/v1/aufgaben/aufgaben-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { isStaffMessagePriority } from "@/lib/staff-messages/types";
import { listBallInbox } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    priority?: string;
    filter?: string;
    unread?: string;
    message?: string;
  }>;
};

function parseInboxFilter(
  raw: string | undefined
): "offen" | "erledigt" | null {
  if (raw === "offen" || raw === "erledigt") {
    return raw;
  }
  return null;
}

export default async function V1EingangPage({ searchParams }: PageProps) {
  const ctx = await requireV1DeskUser({ requireFunction: "inbox" });
  const {
    priority: priorityRaw,
    filter: filterRaw,
    unread: unreadRaw,
    message: messageRaw,
  } = await searchParams;
  const messages = await listBallInbox(ctx.tenantId, ctx.userId, ctx.area);
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
    <V1AppShell ctx={ctx} headerTitle="Meine Aufgaben">
      <V1AufgabenView
        mailbox="eingang"
        messages={messages}
        currentUserId={ctx.userId}
        initialPriority={initialPriority}
        initialFilter={initialFilter}
        initialUnreadOnly={initialUnreadOnly}
        initialMessageId={initialMessageId}
      />
    </V1AppShell>
  );
}
