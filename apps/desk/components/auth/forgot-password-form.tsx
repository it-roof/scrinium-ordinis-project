"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { requestPasswordResetAction } from "@/lib/auth/password-reset-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm({
  brandLabel,
}: {
  brandLabel?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setDoneMessage(result.message);
      toast.success(result.message);
    });
  }

  return (
    <div className="surface-card w-full max-w-md p-8">
      <div className="space-y-2 text-center">
        <BrandWordmark label={brandLabel} className="text-2xl font-medium" />
        <p className="text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
          Passwort vergessen
        </p>
      </div>

      {doneMessage ? (
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <p>{doneMessage}</p>
          <Button asChild variant="outline" className="h-10 w-full px-4">
            <Link href="/login">Zur Anmeldung</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-email">E-Mail</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="h-10 w-full px-4"
            disabled={pending}
          >
            {pending ? "Wird gesendet…" : "Link senden"}
          </Button>

          <p className="text-center text-sm">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Zurück zur Anmeldung
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
