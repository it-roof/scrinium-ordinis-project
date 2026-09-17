export type DashboardViewPreference = "quick" | "all";

export const DASHBOARD_VIEW_OPTIONS = [
  {
    value: "quick" as const,
    label: "Schnellzugriff",
    description: "Kennzahlen und die wichtigsten Funktionen.",
  },
  {
    value: "all" as const,
    label: "Alle Funktionen",
    description: "Volle Übersicht mit allen verfügbaren Werkzeugen.",
  },
] as const;

export function parseDashboardViewPreference(
  raw: string | undefined | null
): DashboardViewPreference {
  return raw === "all" ? "all" : "quick";
}

export function isDashboardViewPreference(
  value: string
): value is DashboardViewPreference {
  return value === "quick" || value === "all";
}
