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
  "inbox",
  "clients",
  "matters",
  "text-blocks",
  "prompts",
  "prompt-kit",
  "letters",
  "docs",
  "templates",
] as const;

export type AreaFunctionId = (typeof AREA_FUNCTION_IDS)[number];

export function isAreaFunctionId(value: string): value is AreaFunctionId {
  return (AREA_FUNCTION_IDS as readonly string[]).includes(value);
}

/**
 * User-Funktions-Allowlist: null = alle Funktionen der freigeschalteten Bereiche.
 * Array = nur diese Funktionen (zusätzlich zur Bereichs-Zuordnung).
 */
export function normalizeOptionalAllowedFunctions(
  input: unknown
): AreaFunctionId[] | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (!Array.isArray(input)) {
    return null;
  }
  const unique = new Set<AreaFunctionId>();
  for (const item of input) {
    if (typeof item === "string" && isAreaFunctionId(item)) {
      unique.add(item);
    }
  }
  return [...unique];
}

export function filterFunctionsByAllowlist(
  functionIds: readonly AreaFunctionId[],
  allowedFunctions: AreaFunctionId[] | null
): AreaFunctionId[] {
  if (allowedFunctions === null) {
    return [...functionIds];
  }
  const allowed = new Set(allowedFunctions);
  return functionIds.filter((id) => allowed.has(id));
}

/** Welche Funktionen zu welchem Bereich gehören. */
export const FUNCTIONS_BY_AREA: Record<AppModuleId, AreaFunctionId[]> = {
  legal: [
    "inbox",
    "clients",
    "matters",
    "prompt-kit",
    "prompts",
    "letters",
    "text-blocks",
  ],
  tax: ["docs", "templates"],
  "restructuring-insolvency": [],
  administration: [],
};

export const FUNCTION_LABELS: Record<AreaFunctionId, string> = {
  inbox: "Eingang",
  clients: "Mandanten",
  matters: "Akten",
  "text-blocks": "Textbausteine",
  prompts: "Prompt-Bibliothek",
  "prompt-kit": "Sachverhalt verarbeiten",
  letters: "Schreiben erstellen",
  docs: "Dokumentation",
  templates: "Vorlagen",
};

/** @deprecated relative Legacy-Pfade — nutze functionHref(area, id) */
export const FUNCTION_ROUTES: Record<
  AreaFunctionId,
  { href: string; label: string }
> = {
  inbox: { href: "/eingang", label: "Eingang" },
  clients: { href: "/mandanten", label: "Mandanten" },
  matters: { href: "/akten", label: "Akten" },
  "text-blocks": { href: "/textbausteine", label: "Textbausteine" },
  prompts: { href: "/prompt", label: "Prompt-Bibliothek" },
  "prompt-kit": { href: "/prompt-baukasten", label: "Sachverhalt verarbeiten" },
  letters: { href: "/schreiben", label: "Schreiben erstellen" },
  docs: { href: "/dokumentation", label: "Dokumentation" },
  templates: { href: "/vorlagen", label: "Vorlagen" },
};

const SEGMENT_TO_FUNCTION = Object.fromEntries(
  Object.entries(FUNCTION_PATH_SEGMENTS).map(([id, segment]) => [segment, id])
) as Record<string, AreaFunctionId>;

export function functionIdFromPathname(
  pathname: string
): AreaFunctionId | null {
  const match = pathname.match(/^\/[^/]+\/([^/]+)/);
  if (match && areaFromSlug(pathname.split("/")[1] ?? "")) {
    const segment = match[1];
    // Legacy: /recht/inbox → eingang
    if (segment === "inbox") {
      return "inbox";
    }
    return SEGMENT_TO_FUNCTION[segment] ?? null;
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
  if (pathname === "/vorlagen" || pathname.startsWith("/vorlagen/")) {
    return "templates";
  }
  if (
    pathname === "/prompt-baukasten" ||
    pathname.startsWith("/prompt-baukasten/")
  ) {
    return "prompt-kit";
  }
  if (pathname === "/schreiben" || pathname.startsWith("/schreiben/")) {
    return "letters";
  }
  if (
    pathname === "/eingang" ||
    pathname.startsWith("/eingang/") ||
    pathname === "/inbox" ||
    pathname.startsWith("/inbox/")
  ) {
    return "inbox";
  }
  if (pathname === "/mandanten" || pathname.startsWith("/mandanten/")) {
    return "clients";
  }
  if (pathname === "/akten" || pathname.startsWith("/akten/")) {
    return "matters";
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

/** Sidebar-Gruppe Verwaltung (Arbeitsorganisation). */
export const MANAGEMENT_FUNCTION_IDS: AreaFunctionId[] = ["clients", "matters"];

/** Sidebar-Gruppe Funktionen (Werkzeuge). */
export const TOOL_FUNCTION_IDS: AreaFunctionId[] = [
  "prompt-kit",
  "prompts",
  "letters",
  "text-blocks",
  "docs",
  "templates",
];

/** Oben separat, ohne Gruppenlabel. */
export const PINNED_FUNCTION_IDS: AreaFunctionId[] = ["inbox"];

export type NavGroup = {
  /** Leer = ohne Gruppenüberschrift (z. B. Eingang ganz oben). */
  label: string;
  items: NavItem[];
};

function navItemForFunction(
  area: AppModuleId,
  functionId: AreaFunctionId
): NavItem {
  const template = navigation.find(
    (item) =>
      item.href === `/${FUNCTION_PATH_SEGMENTS[functionId]}` ||
      item.href === FUNCTION_ROUTES[functionId].href
  );

  return {
    ...(template ?? navigation[0]),
    href: functionHref(area, functionId),
    label: FUNCTION_LABELS[functionId],
  };
}

/** Sidebar: gruppiert in Verwaltung + Funktionen. */
export function navigationGroupsForArea(
  area: ActiveArea,
  allowedFunctions: AreaFunctionId[] | null = null
): NavGroup[] {
  if (area === "all") {
    return [
      {
        label: "Funktionen",
        items: navigation.filter((item) => item.href === "/"),
      },
    ];
  }

  const available = new Set(
    filterFunctionsByAllowlist(getFunctionsForArea(area), allowedFunctions)
  );
  const startItem: NavItem = {
    ...navigation[0],
    href: areaBasePath(area),
    label: "Schreibtisch",
    description: "",
  };

  const pinnedItems = [
    startItem,
    ...PINNED_FUNCTION_IDS.filter((id) => available.has(id)).map((id) =>
      navItemForFunction(area, id)
    ),
  ];

  const managementItems = MANAGEMENT_FUNCTION_IDS.filter((id) =>
    available.has(id)
  ).map((id) => navItemForFunction(area, id));

  const toolItems = TOOL_FUNCTION_IDS.filter((id) => available.has(id)).map(
    (id) => navItemForFunction(area, id)
  );

  const groups: NavGroup[] = [];
  if (pinnedItems.length > 0) {
    groups.push({ label: "", items: pinnedItems });
  }
  if (toolItems.length > 0) {
    groups.push({ label: "Funktionen", items: toolItems });
  }
  if (managementItems.length > 0) {
    groups.push({ label: "Verwaltung", items: managementItems });
  }
  return groups;
}

/** Sidebar: flache Liste (Start + Funktionen) — für Kompatibilität. */
export function navigationForArea(
  area: ActiveArea,
  allowedFunctions: AreaFunctionId[] | null = null
): NavItem[] {
  return navigationGroupsForArea(area, allowedFunctions).flatMap(
    (group) => group.items
  );
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
