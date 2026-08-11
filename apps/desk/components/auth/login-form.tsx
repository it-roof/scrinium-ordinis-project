"use client";

import { useActionState, useEffect } from "react";

import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { loginAction } from "@/lib/auth/actions";
import { KANZLEI_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success) {
      window.location.assign("/");
    }
  }, [state]);

  return (
    <div className="surface-card w-full max-w-md p-8">
      <div className="space-y-2 text-center">
        <BrandWordmark className="text-2xl font-medium" />
        <p className="text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
          {KANZLEI_NAME}
        </p>
      </div>

      <form action={formAction} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11"
          />
        </div>

        {state?.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Nach mehreren Fehlversuchen wird der Zugang vorübergehend gesperrt.
        </p>

        <Button
          type="submit"
          className="h-10 w-full px-4"
          disabled={isPending}
        >
          {isPending ? "Anmelden…" : "Anmelden"}
        </Button>
      </form>
    </div>
  );
}
