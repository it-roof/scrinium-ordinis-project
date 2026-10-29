import type { MatterCollisionMatch, MatterPartyRole } from "@/lib/db/schema";

const OWN_ROLES = new Set<MatterPartyRole>(["client"]);
const OTHER_ROLES = new Set<MatterPartyRole>(["opponent", "opponent_counsel"]);

export type CollisionName = {
  role: MatterPartyRole;
  name: string;
};

export type CollisionMatter = {
  id: string;
  title: string;
  fileNumber: string;
  names: CollisionName[];
};

export function normalizePartyName(value: string) {
  return value
    .toLocaleLowerCase("de")
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesSimilar(left: string, right: string) {
  const a = normalizePartyName(left);
  const b = normalizePartyName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  return a.includes(b) || b.includes(a);
}

export function isRoleConflict(left: MatterPartyRole, right: MatterPartyRole) {
  return (
    (OWN_ROLES.has(left) && OTHER_ROLES.has(right)) ||
    (OTHER_ROLES.has(left) && OWN_ROLES.has(right))
  );
}

export function findCollisionMatches(
  incoming: CollisionName[],
  others: CollisionMatter[]
): MatterCollisionMatch[] {
  const matches: MatterCollisionMatch[] = [];
  const seen = new Set<string>();

  for (const matter of others) {
    for (const incomingName of incoming) {
      for (const existing of matter.names) {
        if (!namesSimilar(incomingName.name, existing.name)) continue;
        if (!isRoleConflict(incomingName.role, existing.role)) continue;
        const key = `${matter.id}:${existing.role}:${normalizePartyName(existing.name)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({
          matterId: matter.id,
          matterTitle: matter.title,
          fileNumber: matter.fileNumber,
          role: existing.role,
          name: existing.name,
        });
      }
    }
  }

  return matches;
}
