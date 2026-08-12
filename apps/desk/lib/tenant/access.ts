import { homeAreaForFunction, type AreaFunctionId } from "@/lib/area/functions";
import { isAppModuleId, type AppModuleId } from "@/lib/modules";
import { getUserEffectiveModules } from "@/lib/tenant/modules";

export type ContentModuleId = "general" | AppModuleId;

const DENIED = "Kein Zugriff auf diesen Bereich." as const;

/** Module, die der User in Listen/Formulare sehen darf (inkl. Allgemein). */
export function contentModulesForUser(
  effectiveModules: readonly AppModuleId[]
): ContentModuleId[] {
  if (effectiveModules.length === 0) {
    return [];
  }
  return ["general", ...effectiveModules];
}

/**
 * Strikte Prüfung für Fachinhalt (`module`-Spalte).
 * `general` nur, wenn der User mindestens ein freigeschaltetes Fachmodul hat.
 */
export async function userCanAccessContentModule(
  userId: string,
  tenantId: string,
  module: string
): Promise<boolean> {
  const enabled = await getUserEffectiveModules(userId, tenantId);

  if (module === "general") {
    return enabled.length > 0;
  }

  if (!isAppModuleId(module)) {
    return false;
  }

  return enabled.includes(module);
}

export async function assertUserCanAccessContentModule(
  userId: string,
  tenantId: string,
  module: string
): Promise<typeof DENIED | null> {
  if (await userCanAccessContentModule(userId, tenantId, module)) {
    return null;
  }
  return DENIED;
}

/** User braucht Zugriff auf den Home-Bereich der Funktion (z. B. Prompt → Recht). */
export async function assertUserCanAccessAreaFunction(
  userId: string,
  tenantId: string,
  functionId: AreaFunctionId
): Promise<typeof DENIED | null> {
  const home = homeAreaForFunction(functionId);
  if (!home) {
    return DENIED;
  }
  return assertUserCanAccessContentModule(userId, tenantId, home);
}

export async function assertUserCanAccessAnyContentModule(
  userId: string,
  tenantId: string,
  modules: readonly string[]
): Promise<typeof DENIED | null> {
  for (const module of modules) {
    if (await userCanAccessContentModule(userId, tenantId, module)) {
      return null;
    }
  }
  return DENIED;
}
