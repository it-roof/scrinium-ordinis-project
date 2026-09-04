import {
  COMMUNICATION_FUNCTION_IDS,
  TOOL_FUNCTION_IDS,
  type AreaFunctionId,
} from "@/lib/area/functions";
import type { AppModuleId } from "@/lib/modules";

export const QUICK_VIEW_FUNCTION_LIMIT = 6;

const STORAGE_PREFIX = "desk-function-usage";

function storageKey(userId: string, area: AppModuleId) {
  return `${STORAGE_PREFIX}:${userId}:${area}`;
}

function readCounts(userId: string, area: AppModuleId): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId, area));
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const counts: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        counts[id] = value;
      }
    }
    return counts;
  } catch {
    return {};
  }
}

export function getFunctionUsageCounts(
  userId: string,
  area: AppModuleId
): Record<string, number> {
  return readCounts(userId, area);
}

export function recordFunctionUse(
  userId: string,
  area: AppModuleId,
  functionId: AreaFunctionId
) {
  if (typeof window === "undefined") {
    return;
  }

  const counts = readCounts(userId, area);
  counts[functionId] = (counts[functionId] ?? 0) + 1;
  window.localStorage.setItem(storageKey(userId, area), JSON.stringify(counts));
}

/** Reihenfolge nur aus Werkzeugen — ohne Kommunikation, Eingang und Verwaltung. */
export function deskFunctionCatalogIds(): AreaFunctionId[] {
  return [...TOOL_FUNCTION_IDS];
}

function compareByUsage(
  a: AreaFunctionId,
  b: AreaFunctionId,
  usage: Record<string, number>,
  fallback: readonly AreaFunctionId[]
) {
  const diff = (usage[b] ?? 0) - (usage[a] ?? 0);
  if (diff !== 0) {
    return diff;
  }
  return fallback.indexOf(a) - fallback.indexOf(b);
}

/**
 * Feste Schnellzugriff-Karten für Rechtsanwalt (Reihenfolge fix).
 * inbox wird als „Alle Nachrichten“ gelabelt und führt zum Eingang.
 */
export const LAWYER_QUICK_VIEW_FUNCTION_IDS: AreaFunctionId[] = [
  "prompts",
  "staff-messages",
  "inbox",
];

/**
 * Priorität für Sekretariat-Schnellzugriff (Fallback ohne Nutzungsdaten).
 * Es werden max. QUICK_VIEW_FUNCTION_LIMIT Karten aus allen verfügbaren Funktionen.
 */
export const SECRETARY_QUICK_VIEW_FALLBACK_IDS: AreaFunctionId[] = [
  "inbox",
  "staff-messages",
  "clients",
  "matters",
  "text-blocks",
  "letters",
];

/**
 * Schnell-Ansicht: Nachrichten-Eingang zuerst, dann Kommunikation
 * und die meistgenutzten übrigen Funktionen.
 */
export function buildQuickViewFunctionIds(
  available: ReadonlySet<AreaFunctionId>,
  usage: Record<string, number>
): AreaFunctionId[] {
  const inboxFirst = available.has("inbox") ? (["inbox"] as const) : [];
  const communication = COMMUNICATION_FUNCTION_IDS.filter((id) =>
    available.has(id)
  );
  const catalog = deskFunctionCatalogIds().filter(
    (id) =>
      available.has(id) &&
      !communication.includes(id) &&
      id !== "inbox" &&
      id !== "inbox-overview"
  );
  const topFunctions = [...catalog]
    .sort((a, b) => compareByUsage(a, b, usage, catalog))
    .slice(0, QUICK_VIEW_FUNCTION_LIMIT);

  return [
    ...inboxFirst,
    ...communication,
    ...topFunctions.sort((a, b) => compareByUsage(a, b, usage, catalog)),
  ];
}

export function buildLawyerQuickViewFunctionIds(
  available: ReadonlySet<AreaFunctionId>
): AreaFunctionId[] {
  return LAWYER_QUICK_VIEW_FUNCTION_IDS.filter((id) => available.has(id));
}

/** Sekretariat: genau 6 Karten aus allen verfügbaren Funktionen (ohne Verlauf). */
export function buildSecretaryQuickViewFunctionIds(
  available: ReadonlySet<AreaFunctionId>,
  usage: Record<string, number>
): AreaFunctionId[] {
  const preferred = SECRETARY_QUICK_VIEW_FALLBACK_IDS.filter((id) =>
    available.has(id)
  );
  const rest = [...available].filter(
    (id) => !preferred.includes(id) && id !== "inbox-overview"
  );
  const catalog = [...preferred, ...rest];
  return [...catalog]
    .sort((a, b) => compareByUsage(a, b, usage, catalog))
    .slice(0, QUICK_VIEW_FUNCTION_LIMIT);
}
