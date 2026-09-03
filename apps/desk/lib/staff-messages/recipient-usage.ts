import type { StaffMessageColleague } from "@/lib/staff-messages/types";
import {
  compareUsersByLastName,
  letterForLastName,
} from "@/lib/users/names";

export const FREQUENT_RECIPIENT_LIMIT = 4;
export const PHONEBOOK_COLUMN_COUNT = 4;

const STORAGE_PREFIX = "staff-message-recipient-usage";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readCounts(userId: string): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
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

export function getRecipientUsageCounts(userId: string): Record<string, number> {
  return readCounts(userId);
}

export function recordRecipientUse(userId: string, recipientId: string) {
  if (typeof window === "undefined" || !recipientId) {
    return;
  }

  const counts = readCounts(userId);
  counts[recipientId] = (counts[recipientId] ?? 0) + 1;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(counts));
}

export function letterForColleagueName(colleague: StaffMessageColleague): string {
  return letterForLastName(colleague.lastName || colleague.name);
}

export function groupColleaguesByLetter(
  colleagues: StaffMessageColleague[]
): Array<{ letter: string; colleagues: StaffMessageColleague[] }> {
  const sorted = [...colleagues].sort(compareUsersByLastName);
  const groups = new Map<string, StaffMessageColleague[]>();

  for (const colleague of sorted) {
    const letter = letterForColleagueName(colleague);
    const list = groups.get(letter) ?? [];
    list.push(colleague);
    groups.set(letter, list);
  }

  return [...groups.entries()].map(([letter, items]) => ({
    letter,
    colleagues: items,
  }));
}

function columnLabel(letters: string[]): string {
  if (letters.length === 0) {
    return "";
  }
  if (letters.length === 1) {
    return letters[0];
  }
  return `${letters[0]}–${letters[letters.length - 1]}`;
}

/**
 * Telefonbuch-Spalten: Buchstabengruppen möglichst gleichmäßig auf
 * bis zu `columnCount` Spalten verteilen. Leere Spalten entfallen;
 * Labels werden dynamisch aus dem Inhalt (z. B. „K–S“).
 */
export function groupColleaguesByPhonebookColumns(
  colleagues: StaffMessageColleague[],
  columnCount = PHONEBOOK_COLUMN_COUNT
): Array<{
  key: string;
  label: string;
  colleagues: StaffMessageColleague[];
}> {
  const letterGroups = groupColleaguesByLetter(colleagues);
  if (letterGroups.length === 0) {
    return [];
  }

  const targetColumns = Math.min(columnCount, letterGroups.length);

  const columns: Array<{
    key: string;
    label: string;
    letters: string[];
    colleagues: StaffMessageColleague[];
  }> = [];

  let groupIndex = 0;

  for (let columnIndex = 0; columnIndex < targetColumns; columnIndex += 1) {
    const columnsRemainingIncludingCurrent = targetColumns - columnIndex;
    const maxExclusive =
      letterGroups.length - (columnsRemainingIncludingCurrent - 1);
    const peopleRemaining = letterGroups
      .slice(groupIndex)
      .reduce((sum, group) => sum + group.colleagues.length, 0);
    const ideal = peopleRemaining / columnsRemainingIncludingCurrent;

    const letters: string[] = [];
    const items: StaffMessageColleague[] = [];
    let peopleInColumn = 0;

    while (groupIndex < maxExclusive) {
      const group = letterGroups[groupIndex];
      const isFirstGroup = letters.length === 0;
      const wouldExceed =
        !isFirstGroup && peopleInColumn + group.colleagues.length > ideal;

      if (wouldExceed && peopleInColumn >= ideal * 0.55) {
        break;
      }

      letters.push(group.letter);
      items.push(...group.colleagues);
      peopleInColumn += group.colleagues.length;
      groupIndex += 1;

      if (
        columnIndex < targetColumns - 1 &&
        peopleInColumn >= ideal &&
        groupIndex < maxExclusive
      ) {
        break;
      }
    }

    if (items.length === 0 && groupIndex < letterGroups.length) {
      const group = letterGroups[groupIndex];
      letters.push(group.letter);
      items.push(...group.colleagues);
      groupIndex += 1;
    }

    if (items.length === 0) {
      continue;
    }

    columns.push({
      key: `col-${columnIndex}-${letters[0]}`,
      label: columnLabel(letters),
      letters,
      colleagues: items,
    });
  }

  if (groupIndex < letterGroups.length && columns.length > 0) {
    const last = columns[columns.length - 1];
    while (groupIndex < letterGroups.length) {
      const group = letterGroups[groupIndex];
      last.letters.push(group.letter);
      last.colleagues.push(...group.colleagues);
      groupIndex += 1;
    }
    last.label = columnLabel(last.letters);
    last.key = `col-${columns.length - 1}-${last.letters[0]}`;
  }

  return columns.map(({ key, label, colleagues: items }) => ({
    key,
    label,
    colleagues: items,
  }));
}

export function splitColleaguesByUsage(
  colleagues: StaffMessageColleague[],
  usage: Record<string, number>,
  limit = FREQUENT_RECIPIENT_LIMIT
): {
  frequent: StaffMessageColleague[];
  allAlphabetical: StaffMessageColleague[];
} {
  const frequent = colleagues
    .filter((colleague) => (usage[colleague.id] ?? 0) > 0)
    .sort((a, b) => {
      const diff = (usage[b.id] ?? 0) - (usage[a.id] ?? 0);
      if (diff !== 0) {
        return diff;
      }
      return compareUsersByLastName(a, b);
    })
    .slice(0, limit);

  const allAlphabetical = [...colleagues].sort(compareUsersByLastName);

  return { frequent, allAlphabetical };
}
