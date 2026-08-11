"use client";

import { signOut } from "next-auth/react";
import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start rounded-full text-sidebar-foreground/70 hover:text-sidebar-foreground"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOutIcon data-icon="inline-start" />
      Abmelden
    </Button>
  );
}
