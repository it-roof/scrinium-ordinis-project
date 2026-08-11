import Link from "next/link";

import { CreateTenantForm } from "@/components/platform/create-tenant-form";
import { PageHeader } from "@/components/layout/page-header";
import type { TenantListItem } from "@/lib/platform/storage";

export function PlatformTenantsView({ tenants }: { tenants: TenantListItem[] }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10">
      <PageHeader
        eyebrow="Plattform"
        title="Super-Admin"
        description="Kanzleien (Tenants) verwalten. Kein Zugriff auf Fachdaten anderer Mandanten."
      />

      <CreateTenantForm />

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-medium tracking-tight">
          Kanzleien
        </h2>

        <div className="surface-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/70 bg-muted/40 text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tenant.slug}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{tenant.userCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="text-sm font-medium text-sky-700 hover:underline"
                    >
                      Öffnen
                    </Link>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Noch keine Tenants.
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
