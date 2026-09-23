import type { AppModuleId, PracticeId } from "@/lib/modules";
import { APP_MODULES, isAppModuleId } from "@/lib/modules";
import type { AreaFunctionId } from "@/lib/area/functions";

/** @deprecated Nutze PracticeId aus @/lib/modules */
export type { PracticeId };

/** URL-Slug pro Practice (kurz, stabil). */
export const PRACTICE_SLUGS: Record<PracticeId, string> = {
  legal: "r",
  tax: "s",
  notary: "n",
  administration: "verwaltung",
};

/** @deprecated Nutze PRACTICE_SLUGS */
export const AREA_SLUGS = PRACTICE_SLUGS;

const SLUG_TO_PRACTICE = Object.fromEntries(
  Object.entries(PRACTICE_SLUGS).map(([id, slug]) => [slug, id])
) as Record<string, PracticeId>;

export type PracticeSlug = (typeof PRACTICE_SLUGS)[PracticeId];

/** @deprecated Nutze PracticeSlug */
export type AreaSlug = PracticeSlug;

export function slugForPractice(practice: PracticeId): string {
  return PRACTICE_SLUGS[practice];
}

/** @deprecated Nutze slugForPractice */
export function slugForArea(area: AppModuleId): string {
  return slugForPractice(area);
}

export function practiceFromSlug(slug: string): PracticeId | null {
  return SLUG_TO_PRACTICE[slug] ?? null;
}

/** @deprecated Nutze practiceFromSlug */
export function areaFromSlug(slug: string): AppModuleId | null {
  return practiceFromSlug(slug);
}

export function isPracticeSlug(value: string): value is PracticeSlug {
  return (Object.values(PRACTICE_SLUGS) as string[]).includes(value);
}

/** @deprecated Nutze isPracticeSlug */
export function isAreaSlug(value: string): value is AreaSlug {
  return isPracticeSlug(value);
}

/** Basis-Pfad einer Practice: /r */
export function practiceBasePath(practice: PracticeId): string {
  return `/${slugForPractice(practice)}`;
}

/** @deprecated Nutze practiceBasePath */
export function areaBasePath(area: AppModuleId): string {
  return practiceBasePath(area);
}

export const FUNCTION_PATH_SEGMENTS: Record<AreaFunctionId, string> = {
  inbox: "eingang",
  "inbox-sent": "gesendet",
  clients: "mandanten",
  matters: "akten",
  "text-blocks": "textbausteine",
  prompts: "prompt",
  notes: "notizen",
  "ai-chat": "ki",
  "case-facts-analysis": "analyse",
  "contract-analysis": "vertragsanalyse",
  "client-intake": "aufnahmebogen",
  letters: "schreiben",
  docs: "dokumentation",
  templates: "vorlagen",
  "staff-messages": "zuweisen",
};

/**
 * Desk-Funktionen ohne Practice in der URL (kanzleiweit / persönlich).
 */
export const DESK_FLAT_HREFS: Partial<Record<AreaFunctionId, string>> = {
  prompts: "/prompt",
  notes: "/notizen",
  "ai-chat": "/ki",
  "contract-analysis": "/vertragsanalyse",
  "client-intake": "/aufnahmebogen",
  inbox: "/eingang",
  "inbox-sent": "/gesendet",
  "staff-messages": "/zuweisen",
};

/** Bereichsgebundene Segmente ohne Practice → Middleware hängt Cookie-Practice vor. */
export const DESK_SCOPED_FLAT_SEGMENTS = [
  "mandanten",
  "akten",
  "textbausteine",
  "analyse",
  "dokumentation",
  "vorlagen",
  "schreiben",
] as const;

export const DESK_DASHBOARD_HREF = "/dashboard";

/** Kanonischer Link für eine Funktion (flach oder practice-scoped). */
export function hrefFor(
  functionId: AreaFunctionId,
  practice?: PracticeId
): string {
  const flat = DESK_FLAT_HREFS[functionId];
  if (flat) {
    return flat;
  }
  if (!practice) {
    throw new Error(
      `hrefFor("${functionId}") benötigt eine Practice (nicht flach).`
    );
  }
  return `${practiceBasePath(practice)}/${FUNCTION_PATH_SEGMENTS[functionId]}`;
}

/** @deprecated Nutze hrefFor */
export function functionHref(
  area: AppModuleId,
  functionId: AreaFunctionId
): string {
  const flat = DESK_FLAT_HREFS[functionId];
  if (flat) {
    return flat;
  }
  return hrefFor(functionId, area);
}

/** Practice aus Pathname: /r/... → legal */
export function parsePracticeFromPathname(
  pathname: string
): PracticeId | null {
  const match = pathname.match(/^\/([^/]+)/);
  if (!match) return null;
  return practiceFromSlug(match[1]);
}

/** @deprecated Nutze parsePracticeFromPathname */
export function parseAreaFromPathname(pathname: string): AppModuleId | null {
  return parsePracticeFromPathname(pathname);
}

export function parsePracticeBasePath(pathname: string): string | null {
  const practice = parsePracticeFromPathname(pathname);
  return practice ? practiceBasePath(practice) : null;
}

/** @deprecated Nutze parsePracticeBasePath */
export function parseAreaBasePath(pathname: string): string | null {
  return parsePracticeBasePath(pathname);
}

export function moduleById(practice: PracticeId) {
  return APP_MODULES.find((entry) => entry.id === practice) ?? null;
}

export function assertPracticeId(value: string): PracticeId {
  if (!isAppModuleId(value)) {
    throw new Error(`Unknown practice: ${value}`);
  }
  return value;
}

/** @deprecated Nutze assertPracticeId */
export function assertAreaId(value: string): AppModuleId {
  return assertPracticeId(value);
}
