export type RecencyGroup = "today" | "yesterday" | "week" | "older";

export function recencyGroup(
  updatedAt: string,
  now = Date.now()
): RecencyGroup {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "older";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";
  if (date >= startOfWeek) return "week";
  return "older";
}

export const RECENCY_LABELS: Record<RecencyGroup, string> = {
  today: "Heute",
  yesterday: "Gestern",
  week: "Letzte 7 Tage",
  older: "Älter",
};

export const RECENCY_ORDER: RecencyGroup[] = [
  "today",
  "yesterday",
  "week",
  "older",
];
