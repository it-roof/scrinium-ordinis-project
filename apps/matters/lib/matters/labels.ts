import type { MatterPartyRole, MatterStatus } from "@/lib/db/schema";

export const PARTY_ROLE_LABELS: Record<MatterPartyRole, string> = {
  client: "Mandant",
  opponent: "Gegner",
  opponent_counsel: "Gegnervertreter",
  court: "Gericht",
  party: "Beteiligter",
  other: "Sonstige",
};

export const EDITABLE_PARTY_ROLES: MatterPartyRole[] = [
  "opponent",
  "opponent_counsel",
  "court",
  "party",
  "other",
];

export const MATTER_STATUS_LABELS: Record<MatterStatus, string> = {
  open: "Offen",
  closed: "Abgeschlossen",
};

export const LEGAL_AREAS = [
  "Arbeitsrecht",
  "Mietrecht",
  "Familienrecht",
  "Verkehrsrecht",
  "Strafrecht",
  "Zivilrecht",
  "Verwaltungsrecht",
  "Gesellschaftsrecht",
  "Sonstiges",
] as const;

export const PROCEEDING_INSTANCES = [
  "1. Instanz",
  "Berufung",
  "Revision",
  "Beschwerde",
] as const;
