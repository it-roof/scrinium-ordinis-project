/** Fach-Module (= Bereiche), die einem Tenant zugewiesen werden. */
export const APP_MODULES = [
  {
    id: "legal",
    label: "Recht",
    chipColor: "bg-indigo-400",
    startDescription:
      "Textbausteine und Prompts für die Rechtsberatung.",
  },
  {
    id: "tax",
    label: "Steuer",
    chipColor: "bg-lime-400",
    startDescription:
      "Dokumentation und Vorlagen für die Steuerberatung.",
  },
  {
    id: "restructuring-insolvency",
    label: "Sanierung & Insolvenz",
    chipColor: "bg-amber-400",
    startDescription:
      "Für diesen Bereich sind noch keine Funktionen freigeschaltet.",
  },
  {
    id: "consulting",
    label: "Beratung",
    chipColor: "bg-rose-400",
    startDescription:
      "Für diesen Bereich sind noch keine Funktionen freigeschaltet.",
  },
] as const;

export type AppModuleId = (typeof APP_MODULES)[number]["id"];

export const ALL_APP_MODULE_IDS: AppModuleId[] = APP_MODULES.map((m) => m.id);

export function isAppModuleId(value: string): value is AppModuleId {
  return ALL_APP_MODULE_IDS.includes(value as AppModuleId);
}

export function normalizeEnabledModules(input: unknown): AppModuleId[] {
  if (!Array.isArray(input)) {
    return [...ALL_APP_MODULE_IDS];
  }

  const unique = new Set<AppModuleId>();
  for (const item of input) {
    if (typeof item === "string" && isAppModuleId(item)) {
      unique.add(item);
    }
  }

  return [...unique];
}

/**
 * User-Modul-Allowlist: null = alle Tenant-Module erben.
 * Leeres Array = kein Fachbereich.
 */
export function normalizeOptionalAllowedModules(
  input: unknown
): AppModuleId[] | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (!Array.isArray(input)) {
    return null;
  }
  return normalizeEnabledModules(input);
}

/** Schnittmenge Tenant-Freigabe ∩ optionaler User-Allowlist. */
export function intersectModules(
  tenantModules: readonly AppModuleId[],
  userAllowed: AppModuleId[] | null
): AppModuleId[] {
  if (userAllowed === null) {
    return [...tenantModules];
  }
  const allowed = new Set(userAllowed);
  return tenantModules.filter((id) => allowed.has(id));
}

export function isModuleEnabled(
  enabledModules: readonly AppModuleId[],
  moduleId: AppModuleId
): boolean {
  return enabledModules.includes(moduleId);
}

/** Bereiche für Formulare/Filter: Allgemein + freigeschaltete Module. */
export function contentModulesForTenant(
  enabledModules: readonly AppModuleId[]
): Array<"general" | AppModuleId> {
  return ["general", ...enabledModules];
}
