import { StaffMessagesView } from "@/components/staff-messages/staff-messages-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { listStaffColleagues } from "@/lib/staff-messages/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaStaffMessagesPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user, area } = await requireAreaFunction(areaSlug, "staff-messages");

  const colleagues = await listStaffColleagues(user.tenantId, user.id);

  return (
    <StaffMessagesView
      colleagues={colleagues}
      module={area}
      currentUserId={user.id}
    />
  );
}
