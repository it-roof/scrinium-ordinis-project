"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { requestMyPasswordResetLinkAction } from "@/lib/auth/password-reset-actions";
import {
  changeMyPasswordAction,
  updateMyProfileAction,
} from "@/lib/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountSettingsForm({
  name: initialName,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [profilePending, startProfile] = useTransition();
  const [passwordPending, startPassword] = useTransition();
  const [linkPending, startLink] = useTransition();

  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function onSaveProfile(event: React.FormEvent) {
    event.preventDefault();

    startProfile(async () => {
      const result = await updateMyProfileAction({ name });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Name gespeichert.");
      router.refresh();
    });
  }

  function onChangePassword(event: React.FormEvent) {
    event.preventDefault();

    startPassword(async () => {
      const result = await changeMyPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Passwort geändert. Andere Sitzungen wurden beendet.");
      router.refresh();
    });
  }

  function onSendResetLink() {
    startLink(async () => {
      const result = await requestMyPasswordResetLinkAction();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSaveProfile} className="surface-card space-y-4 p-6">
        <div>
          <h2 className="font-heading text-lg font-medium tracking-tight">
            Konto
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Name und Login-E-Mail für deinen Zugang.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              className="h-10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">E-Mail</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              disabled
              readOnly
              className="h-10 rounded-none"
            />
            <p className="text-xs text-muted-foreground">
              Die Login-E-Mail ändert nur ein Admin.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={profilePending}
          className="h-10 rounded-none px-4"
        >
          {profilePending ? "Wird gespeichert…" : "Name speichern"}
        </Button>
      </form>

      <form onSubmit={onChangePassword} className="surface-card space-y-4 p-6">
        <div>
          <h2 className="font-heading text-lg font-medium tracking-tight">
            Passwort ändern
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nach dem Ändern bleiben nur diese Sitzung aktiv.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="current-password">Aktuelles Passwort</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="h-10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Neues Passwort</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              autoComplete="new-password"
              className="h-10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Neues Passwort bestätigen</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              autoComplete="new-password"
              className="h-10 rounded-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={passwordPending || linkPending}
            className="h-10 rounded-none px-4"
          >
            {passwordPending ? "Wird geändert…" : "Passwort ändern"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={passwordPending || linkPending || !email}
            onClick={onSendResetLink}
            className="h-10 rounded-none px-4"
          >
            {linkPending ? "Link wird gesendet…" : "Link per E-Mail senden"}
          </Button>
        </div>
      </form>
    </div>
  );
}
