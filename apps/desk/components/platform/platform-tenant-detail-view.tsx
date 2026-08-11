import Link from "next/link";

import { CreateTenantUserForm } from "@/components/platform/create-tenant-user-form";
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
        description={`Slug: ${tenant.slug}`}
      >
        <Link
          href="/platform"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Alle Kanzleien
        </Link>
      </PageHeader>

      <CreateTenantUserForm tenantId={tenant.id} />

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-medium tracking-tight">
          Benutzer
        </h2>

        <div className="surface-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/70 bg-muted/40 text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">E-Mail</th>
                <th className="px-4 py-3 font-medium">Rolle</th>
                <th className="px-4 py-3 font-medium">Plattform</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.platformRole ?? "—"}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Noch keine Benutzer in diesem Tenant.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
