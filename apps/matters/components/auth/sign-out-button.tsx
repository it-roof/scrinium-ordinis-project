"use client";

import { useTransition } from "react";

import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void logoutAction();
        });
      }}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-full border border-border px-7 text-xs font-semibold tracking-[0.12em] text-foreground uppercase transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {pending ? "Abmelden…" : "Abmelden"}
    </button>
  );
}
