"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { UserModulesFields } from "@/components/platform/user-modules-fields";
import { createTenantUserAction } from "@/lib/platform/actions";
import type { UserRole } from "@/lib/db/schema";
import type { AppModuleId } from "@/lib/modules";
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

export function CreateTenantUserDialog({
  open,
  onOpenChange,
  tenantId,
  tenantModules,
  defaultRole = "employee",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantModules: AppModuleId[];
  defaultRole?: UserRole;
}) {
  const isFirstUser = defaultRole === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Benutzer anlegen</DialogTitle>
          <DialogDescription>
            {isFirstUser
              ? "Der erste Zugang sollte ein Kanzlei-Admin sein. Der Benutzer sieht nur Daten dieser Kanzlei."
              : "Der Zugang gilt nur für diese Kanzlei."}
          </DialogDescription>
        </DialogHeader>
        <CreateTenantUserForm
          key={open ? "open" : "closed"}
          tenantId={tenantId}
          tenantModules={tenantModules}
          defaultRole={defaultRole}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateTenantUserForm({
  tenantId,
  tenantModules,
  defaultRole,
  onSuccess,
}: {
  tenantId: string;
  tenantModules: AppModuleId[];
  defaultRole: UserRole;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [allowedModules, setAllowedModules] = useState<AppModuleId[] | null>(
    null
  );

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createTenantUserAction({
        tenantId,
        email,
        name,
        password,
        role,
        allowedModules,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Benutzer angelegt.");
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="user-name">Name</Label>
          <Input
            id="user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
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

        <UserModulesFields
          tenantModules={tenantModules}
          value={allowedModules}
          onChange={setAllowedModules}
        />
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-none px-4"
        >
          {pending ? "Wird angelegt…" : "Benutzer anlegen"}
        </Button>
      </DialogFooter>
    </form>
  );
}
