import { InboxView } from "@/components/inbox/inbox-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getInboxItems } from "@/lib/letters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaInboxPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "inbox");
  const items = await getInboxItems(user.tenantId, user.id);

  return <InboxView items={items} />;
}
