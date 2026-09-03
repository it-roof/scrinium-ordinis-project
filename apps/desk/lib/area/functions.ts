import type { ActiveArea } from "@/lib/area/active-area";
import type { DeskRoleId } from "@/lib/area/desk-roles";
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
  "inbox-overview",
  "clients",
  "matters",
  "compose-letter",
  "compose-email",
  "compose-print",
  "text-blocks",
  "prompts",
  "prompt-kit",
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
 * Compose-Funktionen (Schreiben/E-Mail/Druck) werden mitgeführt, wenn
 * „Sachverhalt verarbeiten“ oder „Schreiben“ freigeschaltet ist — damit
 * bestehende Allowlists nach Feature-Erweiterung nicht leer bleiben.
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
  if (unique.has("prompt-kit") || unique.has("letters")) {
    unique.add("compose-letter");
    unique.add("compose-email");
    unique.add("compose-print");
  }
  const hasOtherLegalFunction = FUNCTIONS_BY_AREA.legal.some(
    (id) => id !== "staff-messages" && unique.has(id)
  );
  if (hasOtherLegalFunction) {
    unique.add("staff-messages");
  }
  if (unique.has("inbox")) {
    unique.add("inbox-overview");
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
    "inbox-overview",
    "clients",
    "matters",
    "prompts",
    "compose-letter",
    "compose-email",
    "compose-print",
    "letters",
    "text-blocks",
    "prompt-kit",
    "staff-messages",
  ],
  tax: ["docs", "templates"],
  "restructuring-insolvency": [],
  administration: [],
};

export const FUNCTION_LABELS: Record<AreaFunctionId, string> = {
  inbox: "Alle Nachrichten",
  "inbox-overview": "Nachrichten Verlauf",
  clients: "Mandanten",
  matters: "Akten",
  "compose-letter": "Schreiben erstellen",
  "compose-email": "E-Mail senden",
  "compose-print": "Dokument drucken",
  "text-blocks": "Textbausteine",
  prompts: "Prompt-Bibliothek",
  "prompt-kit": "Sachverhalt verarbeiten",
  letters: "Schreiben",
  docs: "Dokumentation",
  templates: "Vorlagen",
  "staff-messages": "Nachricht an Mitarbeiter",
};

/** @deprecated relative Legacy-Pfade — nutze functionHref(area, id) */
export const FUNCTION_ROUTES: Record<
  AreaFunctionId,
  { href: string; label: string }
> = {
  inbox: { href: "/eingang", label: "Alle Nachrichten" },
  "inbox-overview": {
    href: "/nachrichten-uebersicht",
    label: "Nachrichten Verlauf",
  },
  clients: { href: "/mandanten", label: "Mandanten" },
  matters: { href: "/akten", label: "Akten" },
  "compose-letter": {
    href: "/schreiben-erstellen",
    label: "Schreiben erstellen",
  },
  "compose-email": { href: "/email-senden", label: "E-Mail senden" },
  "compose-print": { href: "/dokument-drucken", label: "Dokument drucken" },
  "text-blocks": { href: "/textbausteine", label: "Textbausteine" },
  prompts: { href: "/prompt", label: "Prompt-Bibliothek" },
  "prompt-kit": { href: "/prompt-baukasten", label: "Sachverhalt verarbeiten" },
  letters: { href: "/schreiben", label: "Schreiben" },
  docs: { href: "/dokumentation", label: "Dokumentation" },
  templates: { href: "/vorlagen", label: "Vorlagen" },
  "staff-messages": {
    href: "/nachrichten-an-mitarbeiter",
    label: "Nachricht an Mitarbeiter",
  },
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
  if (
    pathname === "/nachrichten-an-mitarbeiter" ||
    pathname.startsWith("/nachrichten-an-mitarbeiter/")
  ) {
    return "staff-messages";
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
  "text-blocks",
  "docs",
  "templates",
  "prompt-kit",
];

/** Sidebar-Gruppe Kommunikation. */
export const COMMUNICATION_FUNCTION_IDS: AreaFunctionId[] = ["staff-messages"];

/**
 * Vorerst nicht in Schreibtisch/Sidebar — Routen und Berechtigungen bleiben aktiv.
 * Zugang z. B. über Sachverhalt verarbeiten oder direkte URLs.
 */
export const NAV_HIDDEN_FUNCTION_IDS: AreaFunctionId[] = [
  "compose-letter",
  "compose-email",
  "compose-print",
  "letters",
];

/** Oben separat, ohne Gruppenlabel. */
export const PINNED_FUNCTION_IDS: AreaFunctionId[] = [
  "inbox",
  "inbox-overview",
];

export type NavGroup = {
  /** Leer = ohne Gruppenüberschrift (z. B. Eingang ganz oben). */
  label: string;
  items: NavItem[];
};

/** Sidebar-Labels, die vom allgemeinen Funktionsnamen abweichen. */
const SIDEBAR_FUNCTION_LABELS: Partial<Record<AreaFunctionId, string>> = {
  "staff-messages": "Nachricht senden",
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
  const isLawyer = deskRole === "rechtsanwalt";
  const isSecretary = deskRole === "sekretariat";
  const startItem: NavItem = {
    ...navigation[0],
    href: areaBasePath(area),
    label: "Übersicht",
    description: "",
  };

  const nachrichtenItems = [
    ...PINNED_FUNCTION_IDS.filter((id) => available.has(id)).map((id) =>
      navItemForFunction(area, id)
    ),
    // Sekretariat: Nachricht an Mitarbeiter direkt unter den Nachrichten-Einträgen.
    ...(isSecretary && available.has("staff-messages")
      ? [navItemForFunction(area, "staff-messages")]
      : []),
  ];

  const managementItems = isLawyer
    ? []
    : MANAGEMENT_FUNCTION_IDS.filter((id) => available.has(id)).map((id) =>
        navItemForFunction(area, id)
      );

  const toolItems = TOOL_FUNCTION_IDS.filter((id) => {
    if (!available.has(id)) {
      return false;
    }
    // Rechtsanwalt: Sachverhalt verarbeiten nicht in der Sidebar.
    if (isLawyer && id === "prompt-kit") {
      return false;
    }
    return true;
  }).map((id) => navItemForFunction(area, id));

  const communicationItems = isSecretary
    ? []
    : COMMUNICATION_FUNCTION_IDS.filter((id) => available.has(id)).map((id) =>
        navItemForFunction(area, id)
      );

  const groups: NavGroup[] = [];
  groups.push({ label: "", items: [startItem] });
  if (nachrichtenItems.length > 0) {
    groups.push({ label: "", items: nachrichtenItems });
  }
  if (toolItems.length > 0) {
    groups.push({ label: "Funktionen", items: toolItems });
  }
  if (communicationItems.length > 0) {
    groups.push({ label: "Kommunikation", items: communicationItems });
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
