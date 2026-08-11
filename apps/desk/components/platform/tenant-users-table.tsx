"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteTenantUserAction,
  updateTenantUserAction,
} from "@/lib/platform/actions";
import type { UserRole } from "@/lib/db/schema";
import type { TenantUserItem } from "@/lib/platform/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TenantUsersTable({
  tenantId,
  users,
}: {
  tenantId: string;
  users: TenantUserItem[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
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
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                tenantId={tenantId}
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
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
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
  );
}

function UserRow({
  user,
  tenantId,
  isEditing,
  pending,
  onEdit,
  onCancel,
  onSaved,
  startTransition,
}: {
  user: TenantUserItem;
  tenantId: string;
  isEditing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: () => void;
  startTransition: (fn: () => void) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const [password, setPassword] = useState("");

  function resetFields() {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword("");
  }

  function onSave(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateTenantUserAction({
        id: user.id,
        tenantId,
        name,
        email,
        role,
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
        <td colSpan={5} className="px-4 py-4">
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`edit-name-${user.id}`}>Name</Label>
                <Input
                  id={`edit-name-${user.id}`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                <Label htmlFor={`edit-role-${user.id}`}>Rolle</Label>
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
      <td className="px-4 py-3 font-medium">{user.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
      <td className="px-4 py-3">{user.role}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {user.platformRole ?? "—"}
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
