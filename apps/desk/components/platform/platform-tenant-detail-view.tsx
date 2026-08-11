import Link from "next/link";

import { CreateTenantUserForm } from "@/components/platform/create-tenant-user-form";
import { EditTenantForm } from "@/components/platform/edit-tenant-form";
import { TenantUsersTable } from "@/components/platform/tenant-users-table";
import { PageHeader } from "@/components/layout/page-header";
import type { Tenant } from "@/lib/db/schema";
import type { TenantUserItem } from "@/lib/platform/storage";

export function PlatformTenantDetailView({
  tenant,
  users,
}: {
  tenant: Tenant;
  users: TenantUserItem[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10">
      <PageHeader
        eyebrow="Plattform"
        title={tenant.name}
        description={
          tenant.customDomain
            ? `Slug: ${tenant.slug} · ${tenant.customDomain}`
            : `Slug: ${tenant.slug}`
        }
      >
        <Link
          href="/platform"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Alle Kanzleien
        </Link>
      </PageHeader>

      <EditTenantForm
        key={`${tenant.id}-${tenant.name}-${tenant.slug}-${tenant.brandName ?? ""}-${tenant.customDomain ?? ""}-${(tenant.enabledModules ?? []).join(",")}`}
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          brandName: tenant.brandName ?? null,
          customDomain: tenant.customDomain ?? null,
          enabledModules: tenant.enabledModules ?? null,
        }}
      />

      <CreateTenantUserForm tenantId={tenant.id} />

      <TenantUsersTable tenantId={tenant.id} users={users} />
    </div>
  );
}
