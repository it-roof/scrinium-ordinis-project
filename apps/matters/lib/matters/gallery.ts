export type MatterSort = "updated" | "created" | "alpha";

export const MATTER_SORT_LABELS: Record<MatterSort, string> = {
  updated: "Zuletzt aktualisiert",
  created: "Erstellungsdatum",
  alpha: "Alphabetisch",
};

export const MATTER_SORTS: MatterSort[] = ["updated", "created", "alpha"];

export type MatterClientGroup<T> = {
  clientId: string;
  clientName: string;
  matters: T[];
};

export function groupMattersByClient<
  T extends {
    title: string;
    createdAt: string;
    updatedAt: string;
    clientId: string;
    clientName: string;
  },
>(items: T[], sort: MatterSort): MatterClientGroup<T>[] {
  const sorted = sortMatters(items, sort);
  const groups = new Map<string, MatterClientGroup<T>>();
  const order: string[] = [];

  for (const matter of sorted) {
    let group = groups.get(matter.clientId);
    if (!group) {
      group = {
        clientId: matter.clientId,
        clientName: matter.clientName,
        matters: [],
      };
      groups.set(matter.clientId, group);
      order.push(matter.clientId);
    }
    group.matters.push(matter);
  }

  const result = order.map((id) => groups.get(id)!);
  if (sort === "alpha") {
    result.sort((a, b) =>
      a.clientName.localeCompare(b.clientName, "de", { sensitivity: "base" })
    );
  }
  return result;
}

export function sortMatters<
  T extends { title: string; createdAt: string; updatedAt: string },
>(items: T[], sort: MatterSort): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sort === "alpha") {
      return a.title.localeCompare(b.title, "de", { sensitivity: "base" });
    }
    const left = sort === "created" ? a.createdAt : a.updatedAt;
    const right = sort === "created" ? b.createdAt : b.updatedAt;
    return new Date(right).getTime() - new Date(left).getTime();
  });
  return copy;
}

export function formatMatterDate(value: string, now = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThatDay = new Date(date);
  startOfThatDay.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / 86_400_000
  );

  if (dayDiff === 0) return "Heute";
  if (dayDiff === 1) return "Gestern";
  if (dayDiff > 1 && dayDiff < 7) return `vor ${dayDiff} Tagen`;

  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}
