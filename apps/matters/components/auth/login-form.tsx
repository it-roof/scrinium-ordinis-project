"use client";

import { useActionState, useEffect } from "react";

import { loginAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (!state?.success) return;
    window.location.assign("/");
  }, [state]);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-5">
      <div className="grid gap-2">
        <label
          htmlFor="email"
          className="text-[0.7rem] font-medium tracking-[0.16em] text-muted-foreground uppercase"
        >
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@kanzlei.de"
          className="h-12 w-full rounded-sm border border-border bg-card px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/30"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="password"
          className="text-[0.7rem] font-medium tracking-[0.16em] text-muted-foreground uppercase"
        >
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-sm border border-border bg-card px-4 text-base text-foreground outline-none focus:border-foreground/30"
        />
      </div>

      {state?.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || Boolean(state?.success)}
        className={cn(
          "mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-foreground px-7 text-xs font-semibold tracking-[0.12em] text-background uppercase transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {isPending || state?.success ? "Anmelden…" : "Anmelden"}
      </button>
    </form>
  );
}
