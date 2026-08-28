"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon, UserIcon } from "lucide-react";

import { CreateTenantUserDialog } from "@/components/platform/create-tenant-user-form";
import { EditTenantForm } from "@/components/platform/edit-tenant-form";
import { TenantUsersTable } from "@/components/platform/tenant-users-table";
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
import type { Tenant } from "@/lib/db/schema";
import { normalizeEnabledModules } from "@/lib/modules";
import type { TenantUserItem } from "@/lib/platform/storage";

export function PlatformTenantDetailView({
  tenant,
  users,
}: {
  tenant: Tenant;
  users: TenantUserItem[];
}) {
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const tenantModules = normalizeEnabledModules(tenant.enabledModules);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10">
      <PageHeader
        title={tenant.name}
        description={
          tenant.customDomain
            ? `Kurzname: ${tenant.slug} · ${tenant.customDomain}`
            : `Kurzname: ${tenant.slug}`
        }
      >
        <Link
          href="/platform"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Alle Kanzleien
        </Link>
      </PageHeader>

      {users.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserIcon />
            </EmptyMedia>
            <EmptyTitle>Noch keine Benutzer</EmptyTitle>
            <EmptyDescription>
              Lege den ersten Zugang an — am besten einen Kanzlei-Admin. Danach
              kannst du weitere Mitarbeiter einladen.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() => setCreateUserOpen(true)}
              className="h-10 rounded-none px-4"
            >
              <PlusIcon data-icon="inline-start" />
              Ersten Benutzer anlegen
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-heading text-xl font-medium tracking-tight">
              Benutzer
            </h2>
            <Button
              onClick={() => setCreateUserOpen(true)}
              variant="outline"
              className="h-10 rounded-none px-4"
            >
              <PlusIcon data-icon="inline-start" />
              Benutzer anlegen
            </Button>
          </div>
          <TenantUsersTable
            tenantId={tenant.id}
            tenantModules={tenantModules}
            users={users}
          />
        </section>
      )}

      <EditTenantForm
        key={`${tenant.id}-${tenant.name}-${tenant.slug}-${tenant.brandName ?? ""}-${tenant.customDomain ?? ""}-${tenantModules.join(",")}`}
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          brandName: tenant.brandName ?? null,
          customDomain: tenant.customDomain ?? null,
          enabledModules: tenant.enabledModules ?? null,
        }}
      />

      <CreateTenantUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        tenantId={tenant.id}
        tenantModules={tenantModules}
        defaultRole={users.length === 0 ? "admin" : "employee"}
      />
    </div>
  );
}
