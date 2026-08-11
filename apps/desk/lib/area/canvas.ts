import type { ActiveArea } from "@/lib/area/active-area";

/** Farbumgebung nur für den rechten Content (Sidebar bleibt unverändert). */
export const AREA_CANVAS_CLASS: Record<ActiveArea, string> = {
  all: "content-canvas",
  tax: "content-canvas content-canvas-tax",
  legal: "content-canvas content-canvas-legal",
  "restructuring-insolvency": "content-canvas content-canvas-restructuring",
  consulting: "content-canvas content-canvas-consulting",
};

export function canvasClassForArea(area: ActiveArea): string {
  return AREA_CANVAS_CLASS[area];
}

export const AREA_ACCENT_DOT: Record<ActiveArea, string> = {
  all: "bg-violet-400",
  tax: "bg-lime-500",
  legal: "bg-indigo-500",
  "restructuring-insolvency": "bg-amber-500",
  consulting: "bg-rose-500",
};
