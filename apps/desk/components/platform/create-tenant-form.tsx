"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createTenantAction } from "@/lib/platform/actions";
import { TenantModulesFields } from "@/components/platform/tenant-modules-fields";
import { ALL_APP_MODULE_IDS, type AppModuleId } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateTenantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Kanzlei</DialogTitle>
          <DialogDescription>
            Zuerst die Kanzlei anlegen. Benutzer lädst du im nächsten Schritt
            ein.
          </DialogDescription>
        </DialogHeader>
        <CreateTenantForm
          key={open ? "open" : "closed"}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateTenantForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [enabledModules, setEnabledModules] = useState<AppModuleId[]>([
    ...ALL_APP_MODULE_IDS,
  ]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugFromName(value));
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createTenantAction({
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

      toast.success("Kanzlei angelegt. Als Nächstes einen Benutzer einladen.");
      onSuccess?.();
      router.push(`/platform/tenants/${result.tenant.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tenant-name">Name</Label>
        <Input
          id="tenant-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="z. B. Muster Kanzlei"
          required
          autoFocus
          className="h-10 rounded-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tenant-slug">Kurzname</Label>
        <Input
          id="tenant-slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          placeholder="muster-kanzlei"
          required
          className="h-10 rounded-none"
        />
        <p className="text-xs text-muted-foreground">
          Wird aus dem Namen erzeugt. Nur Kleinbuchstaben, Zahlen und
          Bindestriche.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((current) => !current)}
        className="text-sm font-medium text-sky-700 hover:underline"
      >
        {showAdvanced
          ? "Weniger Angaben"
          : "Weitere Angaben (Label, Domain, Module)"}
      </button>

      {showAdvanced ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tenant-brand">
              App-Label{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="tenant-brand"
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="Sonst Scrinium Ordinis"
              className="h-10 rounded-none"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tenant-domain">
              Domain{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="tenant-domain"
              value={customDomain}
              onChange={(event) => setCustomDomain(event.target.value)}
              placeholder="orga.beispiel.de"
              className="h-10 rounded-none"
            />
          </div>
          <TenantModulesFields
            value={enabledModules}
            onChange={setEnabledModules}
          />
        </div>
      ) : null}

      <DialogFooter>
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-none px-4"
        >
          {pending ? "Wird angelegt…" : "Kanzlei anlegen"}
        </Button>
      </DialogFooter>
    </form>
  );
}
