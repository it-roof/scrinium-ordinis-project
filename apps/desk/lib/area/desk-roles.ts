import type { AreaFunctionId } from "@/lib/area/functions";
import type { PracticeId } from "@/lib/modules";

/**
 * Kanzlei-Position = Bundle aus Practices + Funktionen.
 * `sekretariat` = RA-Sekretär (teilt Practice `legal`, ohne Prompt/KI-Analyse).
 */
export const DESK_ROLE_IDS = [
  "rechtsanwalt",
  "sekretariat",
  "steuerberater",
  "stb_sekretariat",
] as const;

export type DeskRoleId = (typeof DESK_ROLE_IDS)[number];

export const DESK_ROLE_LABELS: Record<DeskRoleId, string> = {
  rechtsanwalt: "Rechtsanwalt",
  sekretariat: "RA-Sekretär(in)",
  steuerberater: "Steuerberater",
  stb_sekretariat: "StB-Sekretär(in)",
};

export type DeskRoleBundle = {
  practices: readonly PracticeId[];
  functions: readonly AreaFunctionId[];
};

/** Globale Rollen-Matrix (Source of Truth). */
export const DESK_ROLE_BUNDLES: Record<DeskRoleId, DeskRoleBundle> = {
  rechtsanwalt: {
    practices: ["legal"],
    functions: [
      "inbox",
      "inbox-sent",
      "prompts",
      "notes",
      "ai-chat",
      "case-facts-analysis",
      "contract-analysis",
      "staff-messages",
      "clients",
      "matters",
      "text-blocks",
      "letters",
    ],
  },
  sekretariat: {
    practices: ["legal"],
    functions: [
      "inbox",
      "inbox-sent",
      "clients",
      "matters",
      "text-blocks",
      "staff-messages",
      "notes",
      "letters",
    ],
  },
  steuerberater: {
    practices: ["tax"],
    functions: [
      "inbox",
      "inbox-sent",
      "clients",
      "matters",
      "text-blocks",
      "notes",
      "staff-messages",
      "docs",
      "templates",
    ],
  },
  stb_sekretariat: {
    practices: ["tax"],
    functions: [
      "inbox",
      "inbox-sent",
      "clients",
      "matters",
      "text-blocks",
      "notes",
      "staff-messages",
    ],
  },
};

/** @deprecated Nutze DESK_ROLE_BUNDLES[role].functions */
export const FUNCTIONS_BY_DESK_ROLE: Record<DeskRoleId, AreaFunctionId[]> = {
  rechtsanwalt: [...DESK_ROLE_BUNDLES.rechtsanwalt.functions],
  sekretariat: [...DESK_ROLE_BUNDLES.sekretariat.functions],
  steuerberater: [...DESK_ROLE_BUNDLES.steuerberater.functions],
  stb_sekretariat: [...DESK_ROLE_BUNDLES.stb_sekretariat.functions],
};

export function isDeskRoleId(value: string): value is DeskRoleId {
  return (DESK_ROLE_IDS as readonly string[]).includes(value);
}

/** Assistenz-Rollen (gleiche Practice wie Berufsträger, weniger Funktionen). */
export function isSecretaryDeskRole(
  role: DeskRoleId | null | undefined
): boolean {
  return role === "sekretariat" || role === "stb_sekretariat";
}

/** Berufsträger (RA / StB). */
export function isAttorneyDeskRole(
  role: DeskRoleId | null | undefined
): boolean {
  return role === "rechtsanwalt" || role === "steuerberater";
}

/** Eine oder mehrere Rollen → Union der Functions. */
export function functionsForDeskRoles(
  roles: readonly (DeskRoleId | null | undefined)[]
): AreaFunctionId[] | null {
  const ids = roles.filter((r): r is DeskRoleId => Boolean(r && isDeskRoleId(r)));
  if (ids.length === 0) {
    return null;
  }
  const set = new Set<AreaFunctionId>();
  for (const id of ids) {
    for (const fn of DESK_ROLE_BUNDLES[id].functions) {
      set.add(fn);
    }
  }
  return [...set];
}

export function functionsForDeskRole(
  deskRole: DeskRoleId | null | undefined
): AreaFunctionId[] | null {
  return functionsForDeskRoles([deskRole]);
}

/** Eine oder mehrere Rollen → Union der Practices. */
export function practicesForDeskRoles(
  roles: readonly (DeskRoleId | null | undefined)[]
): PracticeId[] | null {
  const ids = roles.filter((r): r is DeskRoleId => Boolean(r && isDeskRoleId(r)));
  if (ids.length === 0) {
    return null;
  }
  const set = new Set<PracticeId>();
  for (const id of ids) {
    for (const practice of DESK_ROLE_BUNDLES[id].practices) {
      set.add(practice);
    }
  }
  return [...set];
}

export function practicesForDeskRole(
  deskRole: DeskRoleId | null | undefined
): PracticeId[] | null {
  return practicesForDeskRoles([deskRole]);
}

/**
 * Effektive Funktions-Allowlist:
 * - Rollen gesetzt → Union der Bundle-Funktionen
 * - optional zusätzliche Allowlist → Schnittmenge
 * - weder noch → null (alle Funktionen der freigeschalteten Practices)
 */
export function resolveEffectiveAllowedFunctions(input: {
  deskRole?: DeskRoleId | null | undefined;
  /** Multi-Rolle (Union); wenn gesetzt, hat Vorrang vor deskRole. */
  deskRoles?: readonly DeskRoleId[] | null;
  allowedFunctions: AreaFunctionId[] | null;
}): AreaFunctionId[] | null {
  const roles =
    input.deskRoles && input.deskRoles.length > 0
      ? input.deskRoles
      : [input.deskRole];
  const fromRole = functionsForDeskRoles(roles);
  const fromAllowlist = input.allowedFunctions;

  if (fromRole === null && fromAllowlist === null) {
    return null;
  }
  if (fromRole === null) {
    return fromAllowlist;
  }
  if (fromAllowlist === null) {
    return fromRole;
  }

  const allowed = new Set(fromAllowlist);
  return fromRole.filter((id) => allowed.has(id));
}

/**
 * Effektive Practices:
 * Tenant-freigeschaltete ∩ Union der Rollen-Practices.
 * Ohne Rolle → alle Tenant-Practices (Legacy).
 */
export function resolveEffectivePractices(input: {
  tenantPractices: readonly PracticeId[];
  deskRole?: DeskRoleId | null | undefined;
  deskRoles?: readonly DeskRoleId[] | null;
}): PracticeId[] {
  const roles =
    input.deskRoles && input.deskRoles.length > 0
      ? input.deskRoles
      : [input.deskRole];
  const fromRole = practicesForDeskRoles(roles);
  if (fromRole === null) {
    return [...input.tenantPractices];
  }
  const tenant = new Set(input.tenantPractices);
  return fromRole.filter((id) => tenant.has(id));
}
