"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { UserModulesFields } from "@/components/platform/user-modules-fields";
import {
  deleteTenantUserAction,
  updateTenantUserAction,
} from "@/lib/platform/actions";
import {
  DESK_ROLE_IDS,
  DESK_ROLE_LABELS,
  type DeskRoleId,
} from "@/lib/area/desk-roles";
import type { DeskRole, UserRole, UserSalutation } from "@/lib/db/schema";
import { APP_MODULES, type AppModuleId } from "@/lib/modules";
import type { TenantUserItem } from "@/lib/platform/storage";
import { USER_SALUTATION_LABELS } from "@/lib/users/names";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function modulesLabel(
  allowedModules: AppModuleId[] | null,
  tenantModules: AppModuleId[]
) {
  if (allowedModules === null) {
    return "Alle";
  }
  if (allowedModules.length === 0) {
    return "Keine";
  }
  const labels = APP_MODULES.filter(
    (module) =>
      allowedModules.includes(module.id) && tenantModules.includes(module.id)
  ).map((module) => module.label);
  return labels.length > 0 ? labels.join(", ") : "Keine";
}

function deskRoleLabel(deskRole: DeskRole | null) {
  if (!deskRole) {
    return "—";
  }
  return DESK_ROLE_LABELS[deskRole];
}

export function TenantUsersTable({
  tenantId,
  tenantModules,
  users,
}: {
  tenantId: string;
  tenantModules: AppModuleId[];
  users: TenantUserItem[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="surface-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/70 bg-muted/40 text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">E-Mail</th>
            <th className="px-4 py-3 font-medium">Zugang</th>
            <th className="px-4 py-3 font-medium">Position</th>
            <th className="px-4 py-3 font-medium">Module</th>
            <th className="px-4 py-3 font-medium">Plattform</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              tenantId={tenantId}
              tenantModules={tenantModules}
              isEditing={editingId === user.id}
              pending={pending}
              onEdit={() => setEditingId(user.id)}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
              startTransition={startTransition}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({
  user,
  tenantId,
  tenantModules,
  isEditing,
  pending,
  onEdit,
  onCancel,
  onSaved,
  startTransition,
}: {
  user: TenantUserItem;
  tenantId: string;
  tenantModules: AppModuleId[];
  isEditing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: () => void;
  startTransition: (fn: () => void) => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [salutation, setSalutation] = useState<UserSalutation>(
    user.salutation ?? "herr"
  );
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const [deskRole, setDeskRole] = useState<DeskRoleId>(
    user.deskRole ?? "rechtsanwalt"
  );
  const [password, setPassword] = useState("");
  const [allowedModules, setAllowedModules] = useState<AppModuleId[] | null>(
    user.allowedModules
  );

  function resetFields() {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setSalutation(user.salutation ?? "herr");
    setEmail(user.email);
    setRole(user.role);
    setDeskRole(user.deskRole ?? "rechtsanwalt");
    setPassword("");
    setAllowedModules(user.allowedModules);
  }

  function onSave(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateTenantUserAction({
        id: user.id,
        tenantId,
        firstName,
        lastName,
        salutation,
        email,
        role,
        deskRole,
        allowedModules,
        password: password || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Benutzer gespeichert.");
      setPassword("");
      onSaved();
    });
  }

  function onDelete() {
    const confirmed = window.confirm(
      `Benutzer „${user.name}“ (${user.email}) wirklich löschen?`
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTenantUserAction({
        id: user.id,
        tenantId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Benutzer gelöscht.");
      onSaved();
    });
  }

  if (isEditing) {
    return (
      <tr className="border-b border-border/50 last:border-0 bg-muted/20">
        <td colSpan={7} className="px-4 py-4">
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`edit-salutation-${user.id}`}>Anrede</Label>
                <select
                  id={`edit-salutation-${user.id}`}
                  value={salutation}
                  onChange={(event) =>
                    setSalutation(event.target.value as UserSalutation)
                  }
                  required
                  className="flex h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
                >
                  {(Object.keys(USER_SALUTATION_LABELS) as UserSalutation[]).map(
                    (id) => (
                      <option key={id} value={id}>
                        {USER_SALUTATION_LABELS[id]}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-first-name-${user.id}`}>Vorname</Label>
                <Input
                  id={`edit-first-name-${user.id}`}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  className="h-10 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-last-name-${user.id}`}>Nachname</Label>
                <Input
                  id={`edit-last-name-${user.id}`}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  className="h-10 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-email-${user.id}`}>E-Mail</Label>
                <Input
                  id={`edit-email-${user.id}`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-10 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-role-${user.id}`}>Zugang</Label>
                <select
                  id={`edit-role-${user.id}`}
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as UserRole)
                  }
                  className="flex h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
                >
                  <option value="admin">Admin (Kanzlei)</option>
                  <option value="employee">Mitarbeiter</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-desk-role-${user.id}`}>Position</Label>
                <select
                  id={`edit-desk-role-${user.id}`}
                  value={deskRole}
                  onChange={(event) =>
                    setDeskRole(event.target.value as DeskRoleId)
                  }
                  required
                  className="flex h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
                >
                  {DESK_ROLE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {DESK_ROLE_LABELS[id]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-password-${user.id}`}>
                  Neues Passwort{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id={`edit-password-${user.id}`}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Optional, sonst unverändert"
                  className="h-10 rounded-none"
                />
              </div>

              <UserModulesFields
                tenantModules={tenantModules}
                value={allowedModules}
                onChange={setAllowedModules}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={pending}
                className="h-9 rounded-none px-4"
              >
                {pending ? "Speichern…" : "Speichern"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="h-9 rounded-none px-4"
                onClick={() => {
                  resetFields();
                  onCancel();
                }}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                className="h-9 rounded-none px-4"
                onClick={onDelete}
              >
                Löschen
              </Button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="px-4 py-3 font-medium">
        {user.salutation
          ? `${USER_SALUTATION_LABELS[user.salutation]} ${user.name}`
          : user.name}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
      <td className="px-4 py-3">
        {user.role === "admin" ? "Admin" : "Mitarbeiter"}
      </td>
      <td className="px-4 py-3">{deskRoleLabel(user.deskRole)}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {modulesLabel(user.allowedModules, tenantModules)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {user.platformRole === "super_admin" ? "Super-Admin" : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-sky-700 hover:underline"
        >
          Bearbeiten
        </button>
      </td>
    </tr>
  );
}
