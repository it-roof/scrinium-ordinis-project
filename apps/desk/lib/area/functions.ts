import type { ActiveArea } from "@/lib/area/active-area";
import {
  areaBasePath,
  areaFromSlug,
  functionHref,
  FUNCTION_PATH_SEGMENTS,
} from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";
import { navigation, type NavItem } from "@/lib/navigation";

/** App-Funktionen, die einem Fach-Bereich zugeordnet sind. */
export const AREA_FUNCTION_IDS = [
  "text-blocks",
  "prompts",
  "docs",
] as const;

export type AreaFunctionId = (typeof AREA_FUNCTION_IDS)[number];

/** Welche Funktionen zu welchem Bereich gehören. */
export const FUNCTIONS_BY_AREA: Record<AppModuleId, AreaFunctionId[]> = {
  legal: ["text-blocks", "prompts"],
  tax: ["docs"],
  "restructuring-insolvency": [],
  consulting: [],
};

export const FUNCTION_LABELS: Record<AreaFunctionId, string> = {
  "text-blocks": "Textbausteine",
  prompts: "Prompt",
  docs: "Dokumentation",
};

/** @deprecated relative Legacy-Pfade — nutze functionHref(area, id) */
export const FUNCTION_ROUTES: Record<
  AreaFunctionId,
  { href: string; label: string }
> = {
  "text-blocks": { href: "/textbausteine", label: "Textbausteine" },
  prompts: { href: "/prompt", label: "Prompt" },
  docs: { href: "/dokumentation", label: "Dokumentation" },
};

const SEGMENT_TO_FUNCTION = Object.fromEntries(
  Object.entries(FUNCTION_PATH_SEGMENTS).map(([id, segment]) => [segment, id])
) as Record<string, AreaFunctionId>;

export function functionIdFromPathname(
  pathname: string
): AreaFunctionId | null {
  const match = pathname.match(/^\/[^/]+\/([^/]+)/);
  if (match && areaFromSlug(pathname.split("/")[1] ?? "")) {
    return SEGMENT_TO_FUNCTION[match[1]] ?? null;
  }

  // Legacy flat routes
  if (pathname === "/textbausteine" || pathname.startsWith("/textbausteine/")) {
    return "text-blocks";
  }
  if (pathname === "/prompt" || pathname.startsWith("/prompt/")) {
    return "prompts";
  }
  if (pathname === "/dokumentation" || pathname.startsWith("/dokumentation/")) {
    return "docs";
  }

  return null;
}

export function getFunctionsForArea(area: ActiveArea): AreaFunctionId[] {
  if (area === "all") {
    return [];
  }

  return FUNCTIONS_BY_AREA[area] ?? [];
}

export function isFunctionAvailableInArea(
  functionId: AreaFunctionId,
  area: ActiveArea
): boolean {
  return getFunctionsForArea(area).includes(functionId);
}

/** Sidebar: Start + Funktionen des aktiven Bereichs (mit Bereichs-URLs). */
export function navigationForArea(area: ActiveArea): NavItem[] {
  if (area === "all") {
    return navigation.filter((item) => item.href === "/");
  }

  const startItem: NavItem = {
    ...navigation[0],
    href: areaBasePath(area),
    label: "Startseite",
    description: "",
  };

  const functionItems = getFunctionsForArea(area).map((functionId) => {
    const template = navigation.find(
      (item) =>
        item.href === `/${FUNCTION_PATH_SEGMENTS[functionId]}` ||
        item.href === FUNCTION_ROUTES[functionId].href
    );

    return {
      ...(template ?? navigation[0]),
      href: functionHref(area, functionId),
      label: FUNCTION_LABELS[functionId],
    } satisfies NavItem;
  });

  return [startItem, ...functionItems];
}

export function areaOwnsFunction(
  area: AppModuleId,
  functionId: AreaFunctionId
): boolean {
  return FUNCTIONS_BY_AREA[area].includes(functionId);
}

export function functionLabelsForArea(area: AppModuleId): string[] {
  return FUNCTIONS_BY_AREA[area].map((id) => FUNCTION_LABELS[id]);
}

/** Canonical-Bereich, dem eine Funktion gehört. */
export function homeAreaForFunction(
  functionId: AreaFunctionId
): AppModuleId | null {
  for (const [area, functions] of Object.entries(FUNCTIONS_BY_AREA) as Array<
    [AppModuleId, AreaFunctionId[]]
  >) {
    if (functions.includes(functionId)) {
      return area;
    }
  }
  return null;
}
