import type { StaffMatterOption } from "@/lib/staff-messages/types";
import { letterForLastName } from "@/lib/users/names";

import { PHONEBOOK_COLUMN_COUNT } from "./recipient-usage";

const STORAGE_PREFIX = "staff-message-matter-usage";
const FREQUENT_MATTER_LIMIT = 4;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readCounts(userId: string): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const counts: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        counts[id] = value;
      }
    }
    return counts;
  } catch {
    return {};
  }
}

export function getMatterUsageCounts(userId: string): Record<string, number> {
  return readCounts(userId);
}

export function recordMatterUse(userId: string, matterId: string) {
  if (typeof window === "undefined" || !matterId) return;
  const counts = readCounts(userId);
  counts[matterId] = (counts[matterId] ?? 0) + 1;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(counts));
}

export function formatMatterLabel(matter: StaffMatterOption): string {
  return `${matter.clientName} — ${matter.title}${
    matter.reference ? ` (${matter.reference})` : ""
  }`;
}

function compareMatters(a: StaffMatterOption, b: StaffMatterOption): number {
  const byClient = a.clientName.localeCompare(b.clientName, "de", {
    sensitivity: "base",
  });
  if (byClient !== 0) return byClient;
  return a.title.localeCompare(b.title, "de", { sensitivity: "base" });
}

function columnLabel(letters: string[]): string {
  if (letters.length === 0) return "";
  if (letters.length === 1) return letters[0];
  return `${letters[0]}–${letters[letters.length - 1]}`;
}

/** Telefonbuch-Spalten nach Mandantenname (erster Buchstabe). */
export function groupMattersByPhonebookColumns(
  matters: StaffMatterOption[],
  columnCount = PHONEBOOK_COLUMN_COUNT
): Array<{ key: string; label: string; matters: StaffMatterOption[] }> {
  const sorted = [...matters].sort(compareMatters);
  const letterGroups = new Map<string, StaffMatterOption[]>();

  for (const matter of sorted) {
    const letter = letterForLastName(matter.clientName);
    const list = letterGroups.get(letter) ?? [];
    list.push(matter);
    letterGroups.set(letter, list);
  }

  const groups = [...letterGroups.entries()].map(([letter, items]) => ({
    letter,
    matters: items,
  }));

  if (groups.length === 0) return [];

  const targetColumns = Math.min(columnCount, groups.length);
  const columns: Array<{
    key: string;
    label: string;
    letters: string[];
    matters: StaffMatterOption[];
  }> = [];

  let groupIndex = 0;
  for (let columnIndex = 0; columnIndex < targetColumns; columnIndex += 1) {
    const columnsRemainingIncludingCurrent = targetColumns - columnIndex;
    const maxExclusive = groups.length - (columnsRemainingIncludingCurrent - 1);
    const peopleRemaining = groups
      .slice(groupIndex)
      .reduce((sum, group) => sum + group.matters.length, 0);
    const ideal = peopleRemaining / columnsRemainingIncludingCurrent;

    const letters: string[] = [];
    const items: StaffMatterOption[] = [];
    let peopleInColumn = 0;

    while (groupIndex < maxExclusive) {
      const group = groups[groupIndex];
      const isFirstGroup = letters.length === 0;
      const wouldExceed =
        !isFirstGroup && peopleInColumn + group.matters.length > ideal;
      if (wouldExceed && peopleInColumn >= ideal * 0.55) break;

      letters.push(group.letter);
      items.push(...group.matters);
      peopleInColumn += group.matters.length;
      groupIndex += 1;

      if (
        columnIndex < targetColumns - 1 &&
        peopleInColumn >= ideal &&
        groupIndex < maxExclusive
      ) {
        break;
      }
    }

    if (items.length === 0 && groupIndex < groups.length) {
      const group = groups[groupIndex];
      letters.push(group.letter);
      items.push(...group.matters);
      groupIndex += 1;
    }

    if (items.length === 0) continue;

    columns.push({
      key: `col-${columnIndex}-${letters[0]}`,
      label: columnLabel(letters),
      letters,
      matters: items,
    });
  }

  if (groupIndex < groups.length && columns.length > 0) {
    const last = columns[columns.length - 1];
    while (groupIndex < groups.length) {
      const group = groups[groupIndex];
      last.letters.push(group.letter);
      last.matters.push(...group.matters);
      groupIndex += 1;
    }
    last.label = columnLabel(last.letters);
    last.key = `col-${columns.length - 1}-${last.letters[0]}`;
  }

  return columns.map(({ key, label, matters: items }) => ({
    key,
    label,
    matters: items,
  }));
}

export function splitMattersByUsage(
  matters: StaffMatterOption[],
  usage: Record<string, number>,
  limit = FREQUENT_MATTER_LIMIT
): {
  frequent: StaffMatterOption[];
  allAlphabetical: StaffMatterOption[];
} {
  const frequent = matters
    .filter((matter) => (usage[matter.id] ?? 0) > 0)
    .sort((a, b) => {
      const diff = (usage[b.id] ?? 0) - (usage[a.id] ?? 0);
      if (diff !== 0) return diff;
      return compareMatters(a, b);
    })
    .slice(0, limit);

  return {
    frequent,
    allAlphabetical: [...matters].sort(compareMatters),
  };
}
