import type { ContentModule } from "@/lib/text-blocks/types";
import { CONTENT_MODULES } from "@/lib/text-blocks/types";
import type { AppModuleId } from "@/lib/modules";
import { APP_MODULES, isAppModuleId } from "@/lib/modules";

export const ACTIVE_AREA_COOKIE = "desk-active-area";

/** Aktiver Arbeits-Bereich: Fach-Modul (Legacy-Cookie „all“ wird aufgelöst). */
export type ActiveArea = AppModuleId | "all";

export function isActiveArea(value: string): value is ActiveArea {
  return value === "all" || isAppModuleId(value);
}

/** Erster freigeschalteter Bereich in Produkt-Reihenfolge. */
export function firstAvailableArea(
  allowedAreas: readonly AppModuleId[]
): AppModuleId | null {
  for (const module of APP_MODULES) {
    if (allowedAreas.includes(module.id)) {
      return module.id;
    }
  }
  return null;
}

/**
 * Cookie / Pfad → konkreter Bereich.
 * Bevorzugt zuletzt genutzten Bereich, sonst den nächsten verfügbaren.
 */
export function parseActiveArea(
  raw: string | undefined,
  allowedAreas: readonly AppModuleId[]
): ActiveArea {
  const fallback = firstAvailableArea(allowedAreas);

  if (allowedAreas.length === 0) {
    return "all";
  }

  if (raw && isAppModuleId(raw) && allowedAreas.includes(raw)) {
    return raw;
  }

  return fallback ?? "all";
}

export function getActiveAreaLabel(area: ActiveArea): string {
  if (area === "all") {
    return "Bereich";
  }

  return (
    CONTENT_MODULES.find((entry) => entry.value === area)?.label ?? area
  );
}

/**
 * Inhalt gehört zum aktiven Bereich:
 * - „Alle“ → alles
 * - Fach-Bereich → genau dieser Bereich (+ Allgemein)
 */
export function itemMatchesActiveArea(
  module: ContentModule,
  area: ActiveArea
): boolean {
  if (area === "all") {
    return true;
  }

  return module === area || module === "general";
}

/** Wie itemMatchesActiveArea, aber ohne „Allgemein“ (Bereichs-Inhalte strikt getrennt). */
export function itemMatchesAreaStrict(
  module: ContentModule,
  area: ActiveArea
): boolean {
  if (area === "all") {
    return true;
  }

  return module === area;
}

/** Formular-Optionen: im Fach-Bereich nur dieser + Allgemein. */
export function modulesForActiveArea<T extends { value: ContentModule }>(
  modules: readonly T[],
  area: ActiveArea
): T[] {
  if (area === "all") {
    return [...modules];
  }

  return modules.filter(
    (entry) => entry.value === area || entry.value === "general"
  );
}

/** Formular-Optionen ohne Allgemein — nur der aktive Fach-Bereich. */
export function modulesForAreaStrict<T extends { value: ContentModule }>(
  modules: readonly T[],
  area: ActiveArea
): T[] {
  if (area === "all") {
    return modules.filter((entry) => entry.value !== "general");
  }

  return modules.filter((entry) => entry.value === area);
}

/** Client-seitig Cookie setzen (nicht httpOnly — bewusst lesbar für UI). */
export function writeActiveAreaCookie(area: ActiveArea): void {
  if (typeof document === "undefined") return;

  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${ACTIVE_AREA_COOKIE}=${encodeURIComponent(area)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
