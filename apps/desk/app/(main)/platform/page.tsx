import { PlatformTenantsView } from "@/components/platform/platform-tenants-view";
import { listTenantsWithUserCounts } from "@/lib/platform/storage";
import { requirePlatformAdmin } from "@/lib/tenant/session";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  await requirePlatformAdmin();
  const tenants = await listTenantsWithUserCounts();

  return <PlatformTenantsView tenants={tenants} />;
}
