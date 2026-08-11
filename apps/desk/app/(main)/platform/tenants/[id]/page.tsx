import { notFound } from "next/navigation";

import { PlatformTenantDetailView } from "@/components/platform/platform-tenant-detail-view";
import {
  getTenantById,
  listUsersForTenant,
} from "@/lib/platform/storage";
import { requirePlatformAdmin } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

type PlatformTenantPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlatformTenantPage({
  params,
}: PlatformTenantPageProps) {
  await requirePlatformAdmin();
  const { id } = await params;
  const tenant = await getTenantById(id);

  if (!tenant) {
    notFound();
  }

  const users = await listUsersForTenant(tenant.id);

  return <PlatformTenantDetailView tenant={tenant} users={users} />;
}
