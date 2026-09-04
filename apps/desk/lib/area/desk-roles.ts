import type { AreaFunctionId } from "@/lib/area/functions";

/** Kanzlei-Position für Schreibtisch und Funktionszugriff (nicht admin/employee). */
export const DESK_ROLE_IDS = ["rechtsanwalt", "sekretariat"] as const;

export type DeskRoleId = (typeof DESK_ROLE_IDS)[number];

export const DESK_ROLE_LABELS: Record<DeskRoleId, string> = {
  rechtsanwalt: "Rechtsanwalt",
  sekretariat: "Sekretariat",
};

/**
 * Funktionen je Position.
 * Compose-IDs bleiben im Profil (Deep-Links / Prompt-Kit), auch wenn sie
 * vorerst aus Sidebar/Schreibtisch ausgeblendet sind.
 */
export const FUNCTIONS_BY_DESK_ROLE: Record<DeskRoleId, AreaFunctionId[]> = {
  rechtsanwalt: [
    "inbox",
    "inbox-sent",
    "inbox-overview",
    "clients",
    "matters",
    "prompts",
    "prompt-kit",
    "compose-letter",
    "compose-email",
    "compose-print",
    "letters",
    "text-blocks",
    "staff-messages",
  ],
  sekretariat: [
    "inbox",
    "inbox-sent",
    "inbox-overview",
    "clients",
    "matters",
    "letters",
    "text-blocks",
    "staff-messages",
  ],
};

export function isDeskRoleId(value: string): value is DeskRoleId {
  return (DESK_ROLE_IDS as readonly string[]).includes(value);
}

export function functionsForDeskRole(
  deskRole: DeskRoleId | null | undefined
): AreaFunctionId[] | null {
  if (!deskRole) {
    return null;
  }
  return [...FUNCTIONS_BY_DESK_ROLE[deskRole]];
}

/**
 * Effektive Allowlist:
 * - Position gesetzt → deren Funktionen
 * - optional zusätzliche Allowlist → Schnittmenge
 * - weder noch → null (alle Funktionen der freigeschalteten Bereiche)
 */
export function resolveEffectiveAllowedFunctions(input: {
  deskRole: DeskRoleId | null | undefined;
  allowedFunctions: AreaFunctionId[] | null;
}): AreaFunctionId[] | null {
  const fromRole = functionsForDeskRole(input.deskRole);
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
