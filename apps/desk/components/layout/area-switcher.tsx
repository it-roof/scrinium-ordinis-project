"use client";

import { useRouter } from "next/navigation";

import { useActiveArea } from "@/components/layout/active-area-provider";
import { type ActiveArea } from "@/lib/area/active-area";
import { areaBasePath } from "@/lib/area/paths";
import { APP_MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

const AREA_UNDERLINE: Record<string, string> = {
  legal: "decoration-indigo-500",
  tax: "decoration-lime-500",
  "restructuring-insolvency": "decoration-amber-500",
  administration: "decoration-rose-500",
};

export function AreaSwitcher() {
  const router = useRouter();
  const { activeArea, setActiveArea, allowedAreas } = useActiveArea();

  const options = APP_MODULES.filter((module) =>
    allowedAreas.includes(module.id)
  );

  if (options.length === 0) {
    return null;
  }

  function selectArea(areaId: Exclude<ActiveArea, "all">) {
    if (areaId === activeArea) {
      return;
    }

    setActiveArea(areaId);
    router.push(areaBasePath(areaId));
  }

  return (
    <div
      className="flex max-w-[min(100vw-8rem,48rem)] flex-wrap items-center justify-center gap-x-4 gap-y-1"
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
  );
}
