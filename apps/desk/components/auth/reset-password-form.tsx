"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { resetPasswordWithTokenAction } from "@/lib/auth/password-reset-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({
  token,
  brandLabel,
}: {
  token: string;
  brandLabel?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await resetPasswordWithTokenAction({
        token,
        newPassword,
        confirmPassword,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Passwort gespeichert.");
      router.replace("/");
      router.refresh();
    });
  }

  if (!token) {
    return (
      <div className="surface-card w-full max-w-md space-y-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Link ist ungültig oder unvollständig.
        </p>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/passwort-vergessen">Neuen Link anfordern</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="surface-card w-full max-w-md p-8">
      <div className="space-y-2 text-center">
        <BrandWordmark label={brandLabel} className="text-2xl font-medium" />
        <p className="text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
          Neues Passwort
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="new-password">Neues Passwort</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            autoComplete="new-password"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Passwort bestätigen</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
            className="h-11"
          />
        </div>

        <Button type="submit" className="h-10 w-full px-4" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Passwort speichern"}
        </Button>
      </form>
    </div>
  );
}
