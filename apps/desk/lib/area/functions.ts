import type { ActiveArea } from "@/lib/area/active-area";
import {
  isAttorneyDeskRole,
  isDeskRoleId,
  type DeskRoleId,
} from "@/lib/area/desk-roles";
import {
  areaBasePath,
  areaFromSlug,
  functionHref,
  FUNCTION_PATH_SEGMENTS,
  DESK_FLAT_HREFS,
} from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";
import { navigation, type NavItem } from "@/lib/navigation";

/** App-Funktionen, die einem Fach-Bereich zugeordnet sind. */
export const AREA_FUNCTION_IDS = [
  "inbox",
  "inbox-sent",
  "clients",
  "matters",
  "text-blocks",
  "prompts",
  "notes",
  "case-facts-analysis",
  "letters",
  "docs",
  "templates",
  "staff-messages",
] as const;

export type AreaFunctionId = (typeof AREA_FUNCTION_IDS)[number];

export function isAreaFunctionId(value: string): value is AreaFunctionId {
  return (AREA_FUNCTION_IDS as readonly string[]).includes(value);
}

/**
 * User-Funktions-Allowlist: null = alle Funktionen der freigeschalteten Bereiche.
 * Array = nur diese Funktionen (zusätzlich zur Bereichs-Zuordnung).
 *
 * „Nachricht an Mitarbeiter“ wird mitgeführt, wenn der User bereits
 * mindestens eine andere Recht-Funktion in der Allowlist hat.
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
  const hasOtherLegalFunction = FUNCTIONS_BY_AREA.legal.some(
    (id) => id !== "staff-messages" && unique.has(id)
  );
  if (hasOtherLegalFunction) {
    unique.add("staff-messages");
  }
  if (unique.has("inbox")) {
    unique.add("inbox-sent");
  }
  // Notizen: neue RA-Funktion — bestehende Allowlists mit Prompts mitziehen
  if (unique.has("prompts")) {
    unique.add("notes");
  }
  // KI-Analyse: mitziehen wenn Prompts oder Akten freigeschaltet
  if (unique.has("prompts") || unique.has("matters")) {
    unique.add("case-facts-analysis");
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
    "inbox-sent",
    "clients",
    "matters",
    "prompts",
    "notes",
    "letters",
    "text-blocks",
    "case-facts-analysis",
    "staff-messages",
  ],
  tax: [
    "inbox",
    "inbox-sent",
    "clients",
    "matters",
    "notes",
    "text-blocks",
    "staff-messages",
    "docs",
    "templates",
  ],
  notary: [],
  administration: [],
};

export const FUNCTION_LABELS: Record<AreaFunctionId, string> = {
  inbox: "Meine Aufgaben",
  "inbox-sent": "Gesendet",
  clients: "Mandanten",
  matters: "Akten",
  "text-blocks": "Textbausteine",
  prompts: "Prompt-Bibliothek",
  notes: "Notizen",
  "case-facts-analysis": "KI-Analyse",
  letters: "Schreiben",
  docs: "Dokumentation",
  templates: "Vorlagen",
  "staff-messages": "Aufgabe zuweisen",
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
    return SEGMENT_TO_FUNCTION[segment] ?? null;
  }

  // Flache Desk-Routen (ohne Practice-Prefix)
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
  if (pathname === "/schreiben" || pathname.startsWith("/schreiben/")) {
    return "letters";
  }
  if (pathname === "/eingang" || pathname.startsWith("/eingang/")) {
    return "inbox";
  }
  if (pathname === "/gesendet" || pathname.startsWith("/gesendet/")) {
    return "inbox-sent";
  }
  if (pathname === "/mandanten" || pathname.startsWith("/mandanten/")) {
    return "clients";
  }
  if (pathname === "/akten" || pathname.startsWith("/akten/")) {
    return "matters";
  }
  if (pathname === "/analyse" || pathname.startsWith("/analyse/")) {
    return "case-facts-analysis";
  }
  if (
    pathname === "/nachrichten-an-mitarbeiter" ||
    pathname.startsWith("/nachrichten-an-mitarbeiter/") ||
    pathname === "/zuweisen" ||
    pathname.startsWith("/zuweisen/")
  ) {
    return "staff-messages";
  }
  if (pathname === "/notizen" || pathname.startsWith("/notizen/")) {
    return "notes";
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
  "prompts",
  "notes",
  "case-facts-analysis",
  "letters",
  "text-blocks",
  "docs",
  "templates",
];

/** Sidebar-Gruppe Kommunikation. */
export const COMMUNICATION_FUNCTION_IDS: AreaFunctionId[] = ["staff-messages"];

/** Oben unter „Kommunikation“: Aufgabe zuweisen, Meine Aufgaben (Gesendet liegt darunter). */
export const PINNED_FUNCTION_IDS: AreaFunctionId[] = [
  "staff-messages",
  "inbox",
];

export type NavGroup = {
  /** Leer = ohne Gruppenüberschrift (z. B. Eingang ganz oben). */
  label: string;
  items: NavItem[];
};

/** Sidebar-Labels, die vom allgemeinen Funktionsnamen abweichen. */
const SIDEBAR_FUNCTION_LABELS: Partial<Record<AreaFunctionId, string>> = {
  "staff-messages": "Aufgabe zuweisen",
};

function navItemForFunction(
  area: AppModuleId,
  functionId: AreaFunctionId
): NavItem {
  const flat = DESK_FLAT_HREFS[functionId];
  const segmentHref = `/${FUNCTION_PATH_SEGMENTS[functionId]}`;
  const template = navigation.find(
    (item) => item.href === flat || item.href === segmentHref
  );

  return {
    ...(template ?? navigation[0]),
    href: functionHref(area, functionId),
    label: SIDEBAR_FUNCTION_LABELS[functionId] ?? FUNCTION_LABELS[functionId],
  };
}

/** Sidebar: gruppiert in Verwaltung + Funktionen. */
export function navigationGroupsForArea(
  area: ActiveArea,
  allowedFunctions: AreaFunctionId[] | null = null,
  deskRole: DeskRoleId | null = null
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
  const isDeskUser = deskRole !== null && isDeskRoleId(deskRole);
  const startItem: NavItem = {
    ...navigation[0],
    href: isDeskUser ? "/dashboard" : areaBasePath(area),
    label: "Übersicht",
    description: "",
  };

  const nachrichtenItems = PINNED_FUNCTION_IDS.filter((id) =>
    available.has(id)
  ).map((id) => navItemForFunction(area, id));

  const attorneyLike = isAttorneyDeskRole(deskRole);

  const managementItems = attorneyLike
    ? []
    : MANAGEMENT_FUNCTION_IDS.filter((id) => available.has(id)).map((id) =>
        navItemForFunction(area, id)
      );

  const toolItems = TOOL_FUNCTION_IDS.filter((id) => available.has(id)).map(
    (id) => navItemForFunction(area, id)
  );

  const groups: NavGroup[] = [];
  groups.push({ label: "", items: [startItem] });
  if (nachrichtenItems.length > 0) {
    groups.push({ label: "Kommunikation", items: nachrichtenItems });
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
  allowedFunctions: AreaFunctionId[] | null = null,
  deskRole: DeskRoleId | null = null
): NavItem[] {
  return navigationGroupsForArea(area, allowedFunctions, deskRole).flatMap(
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

/** Alle Bereiche, in denen eine Funktion hängt. */
export function areasForFunction(functionId: AreaFunctionId): AppModuleId[] {
  return (
    Object.entries(FUNCTIONS_BY_AREA) as Array<[AppModuleId, AreaFunctionId[]]>
  )
    .filter(([, functions]) => functions.includes(functionId))
    .map(([area]) => area);
}

/** Canonical-Bereich, dem eine Funktion gehört. */
export function homeAreaForFunction(
  functionId: AreaFunctionId
): AppModuleId | null {
  return areasForFunction(functionId)[0] ?? null;
}
