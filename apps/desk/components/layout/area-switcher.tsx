"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { useActiveArea } from "@/components/layout/active-area-provider";
import {
  getActiveAreaLabel,
  type ActiveArea,
} from "@/lib/area/active-area";
import { areaBasePath } from "@/lib/area/paths";
import { APP_MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

const AREA_UNDERLINE: Record<string, string> = {
  legal: "decoration-indigo-500",
  tax: "decoration-lime-500",
  "restructuring-insolvency": "decoration-amber-500",
  consulting: "decoration-rose-500",
};

export function AreaSwitcher() {
  const router = useRouter();
  const { activeArea, setActiveArea, allowedAreas } = useActiveArea();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const options = APP_MODULES.filter((module) =>
    allowedAreas.includes(module.id)
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (options.length === 0) {
    return null;
  }

  function selectArea(areaId: Exclude<ActiveArea, "all">) {
    if (areaId === activeArea) {
      setOpen(false);
      return;
    }

    setActiveArea(areaId);
    setOpen(false);
    router.push(areaBasePath(areaId));
  }

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-9 items-center justify-center"
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex h-9 max-w-[18rem] items-center gap-1.5 px-1 text-sm font-medium",
            "animate-[area-switcher-in_220ms_ease-out]",
            "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          )}
        >
          <span className="min-w-0 truncate">
            {activeArea === "all"
              ? "Bereich"
              : getActiveAreaLabel(activeArea)}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <div
          className="flex max-w-[min(100vw-8rem,40rem)] flex-wrap items-center justify-center gap-x-4 gap-y-1 animate-[area-switcher-in_240ms_ease-out]"
          role="listbox"
          aria-label="Bereich wählen"
        >
          {options.map((module) => {
            const isActive = activeArea === module.id;

            return (
              <button
                key={module.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => selectArea(module.id)}
                className={cn(
                  "h-9 shrink-0 px-0.5 text-sm font-medium transition-colors duration-200",
                  "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  isActive
                    ? cn(
                        "text-foreground underline decoration-2 underline-offset-6",
                        AREA_UNDERLINE[module.id]
                      )
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {module.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
