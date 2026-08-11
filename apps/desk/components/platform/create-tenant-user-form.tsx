"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createTenantUserAction } from "@/lib/platform/actions";
import type { UserRole } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateTenantUserForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("admin");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createTenantUserAction({
        tenantId,
        email,
        name,
        password,
        role,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Benutzer angelegt.");
      setEmail("");
      setName("");
      setPassword("");
      setRole("admin");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 p-6">
      <div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Benutzer einladen
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Neuer User gehört nur zu diesem Tenant.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="user-name">Name</Label>
          <Input
            id="user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="h-10 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email">E-Mail</Label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="h-10 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-password">Passwort</Label>
          <Input
            id="user-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="h-10 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-role">Rolle</Label>
          <select
            id="user-role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="flex h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
          >
            <option value="admin">Admin (Kanzlei)</option>
            <option value="employee">Mitarbeiter</option>
          </select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-10 rounded-none px-4"
      >
        {pending ? "Wird angelegt…" : "Benutzer anlegen"}
      </Button>
    </form>
  );
}
