"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteTenantAction,
  updateTenantAction,
} from "@/lib/platform/actions";
import { TenantModulesFields } from "@/components/platform/tenant-modules-fields";
import {
  normalizeEnabledModules,
  type AppModuleId,
} from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditTenantForm({
  tenant,
}: {
  tenant: {
    id: string;
    name: string;
    slug: string;
    brandName: string | null;
    customDomain: string | null;
    enabledModules: AppModuleId[] | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [brandName, setBrandName] = useState(tenant.brandName ?? "");
  const [customDomain, setCustomDomain] = useState(tenant.customDomain ?? "");
  const [enabledModules, setEnabledModules] = useState<AppModuleId[]>(
    normalizeEnabledModules(tenant.enabledModules)
  );

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateTenantAction({
        id: tenant.id,
        name,
        slug,
        brandName,
        customDomain,
        enabledModules,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Kanzlei gespeichert.");
      router.refresh();
    });
  }

  function onDelete() {
    const confirmed = window.confirm(
      `Kanzlei „${tenant.name}“ wirklich löschen?\n\nAlle Benutzer und Fachdaten dieses Tenants werden unwiderruflich gelöscht.`
    );

    if (!confirmed) {
      return;
    }

    startDelete(async () => {
      const result = await deleteTenantAction({ id: tenant.id });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Kanzlei gelöscht.");
      router.push("/platform");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 p-6">
      <div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Kanzlei bearbeiten
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Name, Slug, App-Label, Domain und Module. Fachdaten anderer Kanzleien
          bleiben unberührt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-tenant-name">Name</Label>
          <Input
            id="edit-tenant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="h-10 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-tenant-slug">Slug</Label>
          <Input
            id="edit-tenant-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            className="h-10 rounded-none"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-tenant-brand">
            App-Label{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="edit-tenant-brand"
            value={brandName}
            onChange={(event) => setBrandName(event.target.value)}
            placeholder="Optional, sonst Scrinium Ordinis"
            className="h-10 rounded-none"
          />
          <p className="text-xs text-muted-foreground">
            Wird nach dem Login (und auf der Custom-Domain schon beim Login)
            statt „Scrinium Ordinis“ angezeigt.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-tenant-domain">
            Domain{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="edit-tenant-domain"
            value={customDomain}
            onChange={(event) => setCustomDomain(event.target.value)}
            placeholder="orga.dr-schneiderbanger.de"
            className="h-10 rounded-none"
          />
          <p className="text-xs text-muted-foreground">
            Eine Domain pro Kanzlei. DNS muss auf dieselbe Desk-App zeigen.
            Login über diese Domain nur für User dieses Tenants.
          </p>
        </div>
        <TenantModulesFields
          value={enabledModules}
          onChange={setEnabledModules}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={pending || deleting}
          className="h-10 rounded-none px-4"
        >
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending || deleting}
          onClick={onDelete}
          className="h-10 rounded-none px-4"
        >
          {deleting ? "Wird gelöscht…" : "Kanzlei löschen"}
        </Button>
      </div>
    </form>
  );
}
