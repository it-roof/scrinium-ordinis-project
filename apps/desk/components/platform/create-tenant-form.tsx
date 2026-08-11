"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createTenantAction } from "@/lib/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateTenantForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createTenantAction({ name, slug });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Tenant angelegt.");
      setName("");
      setSlug("");
      router.push(`/platform/tenants/${result.tenant.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 p-6">
      <div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Neue Kanzlei
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Legt einen Tenant an — ohne Zugriff auf Fachdaten anderer Kanzleien.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Name</Label>
          <Input
            id="tenant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Muster Kanzlei"
            required
            className="h-10 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-slug">Slug</Label>
          <Input
            id="tenant-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="muster-kanzlei"
            required
            className="h-10 rounded-none"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-10 rounded-none px-4"
      >
        {pending ? "Wird angelegt…" : "Tenant anlegen"}
      </Button>
    </form>
  );
}
