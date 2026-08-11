import type { AppModuleId } from "@/lib/modules";
import { APP_MODULES, isAppModuleId } from "@/lib/modules";
import type { AreaFunctionId } from "@/lib/area/functions";

/** URL-Slug pro Bereich (deutsch, stabil). */
export const AREA_SLUGS: Record<AppModuleId, string> = {
  legal: "recht",
  tax: "steuer",
  "restructuring-insolvency": "sanierung-insolvenz",
  consulting: "beratung",
};

/** Alte / alternative Slugs → Bereich. */
export const AREA_SLUG_ALIASES: Record<string, AppModuleId> = {
  steuerberatung: "tax",
  unternehmensberatung: "consulting",
};

const SLUG_TO_AREA = {
  ...Object.fromEntries(
    Object.entries(AREA_SLUGS).map(([id, slug]) => [slug, id])
  ),
  ...AREA_SLUG_ALIASES,
} as Record<string, AppModuleId>;

export type AreaSlug = (typeof AREA_SLUGS)[AppModuleId];

export function slugForArea(area: AppModuleId): string {
  return AREA_SLUGS[area];
}

export function areaFromSlug(slug: string): AppModuleId | null {
  return SLUG_TO_AREA[slug] ?? null;
}

export function isAreaSlug(value: string): value is AreaSlug {
  return value in SLUG_TO_AREA && AREA_SLUGS[SLUG_TO_AREA[value]] === value;
}

/** Basis-Pfad eines Bereichs: /recht */
export function areaBasePath(area: AppModuleId): string {
  return `/${slugForArea(area)}`;
}

export const FUNCTION_PATH_SEGMENTS: Record<AreaFunctionId, string> = {
  "text-blocks": "textbausteine",
  prompts: "prompt",
  docs: "dokumentation",
};

export function functionHref(
  area: AppModuleId,
  functionId: AreaFunctionId
): string {
  return `${areaBasePath(area)}/${FUNCTION_PATH_SEGMENTS[functionId]}`;
}

/** Bereich aus Pathname lesen: /recht/... → legal */
export function parseAreaFromPathname(pathname: string): AppModuleId | null {
  const match = pathname.match(/^\/([^/]+)/);
  if (!match) return null;
  return areaFromSlug(match[1]);
}

export function parseAreaBasePath(pathname: string): string | null {
  const area = parseAreaFromPathname(pathname);
  return area ? areaBasePath(area) : null;
}

export function moduleById(area: AppModuleId) {
  return APP_MODULES.find((entry) => entry.id === area) ?? null;
}

export function assertAreaId(value: string): AppModuleId {
  if (!isAppModuleId(value)) {
    throw new Error(`Unknown area: ${value}`);
  }
  return value;
}
