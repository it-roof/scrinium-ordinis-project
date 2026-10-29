"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function AppearanceToggle({ className }: { className?: string }) {
  const { appearance, toggleAppearance } = useTheme();
  const isDark = appearance === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("rounded-none", className)}
      onClick={toggleAppearance}
      aria-label={isDark ? "Hellmodus" : "Dunkelmodus"}
      title={isDark ? "Hellmodus" : "Dunkelmodus"}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
