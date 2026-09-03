"use client";

import { useTransition } from "react";
import { LogOutIcon } from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="w-full justify-start rounded-full text-sidebar-foreground/70 hover:text-sidebar-foreground"
      onClick={() => {
        startTransition(() => {
          void logoutAction();
        });
      }}
    >
      <LogOutIcon data-icon="inline-start" />
      {pending ? "Abmelden…" : "Abmelden"}
    </Button>
  );
}
