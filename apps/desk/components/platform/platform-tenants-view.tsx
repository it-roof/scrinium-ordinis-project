"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2Icon, ChevronRightIcon, PlusIcon } from "lucide-react";

import { CreateTenantDialog } from "@/components/platform/create-tenant-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { TenantListItem } from "@/lib/platform/storage";

function userCountLabel(count: number) {
  if (count === 1) {
    return "1 Benutzer";
  }
  return `${count} Benutzer`;
}

export function PlatformTenantsView({ tenants }: { tenants: TenantListItem[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Kanzleien"
        description="Mandanten der Plattform. Öffne eine Kanzlei, um Benutzer und Module zu verwalten."
      >
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 rounded-none px-4"
        >
          <PlusIcon data-icon="inline-start" />
          Neue Kanzlei
        </Button>
      </PageHeader>

      {tenants.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2Icon />
            </EmptyMedia>
            <EmptyTitle>Noch keine Kanzlei</EmptyTitle>
            <EmptyDescription>
              Lege die erste Kanzlei an. Anschließend kannst du Benutzer
              einladen.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-10 rounded-none px-4"
            >
              <PlusIcon data-icon="inline-start" />
              Erste Kanzlei anlegen
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/70 bg-muted/40 text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Kurzname</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Benutzer</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Öffnen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/30"
                  onClick={() => router.push(`/platform/tenants/${tenant.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="hover:underline"
                    >
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tenant.slug}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tenant.customDomain ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {userCountLabel(tenant.userCount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"
                    >
                      Öffnen
                      <ChevronRightIcon className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
