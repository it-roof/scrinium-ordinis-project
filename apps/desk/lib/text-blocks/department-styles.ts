import type { Department } from "./types";

export const departmentStyles: Record<
  Department,
  {
    badge: string;
    accent: string;
    dot: string;
    pill: string;
    wash: string;
  }
> = {
  general: {
    badge: "bg-slate-100/90 text-slate-700 ring-slate-200/70",
    accent: "border-l-slate-400",
    dot: "bg-slate-400",
    pill: "bg-slate-600 text-white shadow-sm",
    wash: "bg-gradient-to-br from-slate-50/80 to-white",
  },
  tax: {
    badge: "bg-sky-50/90 text-sky-900 ring-sky-200/60",
    accent: "border-l-sky-400",
    dot: "bg-sky-500",
    pill: "bg-sky-600 text-white shadow-sm shadow-sky-600/20",
    wash: "bg-gradient-to-br from-sky-50/70 via-white to-white",
  },
  legal: {
    badge: "bg-indigo-50/90 text-indigo-950 ring-indigo-200/60",
    accent: "border-l-indigo-400",
    dot: "bg-indigo-500",
    pill: "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20",
    wash: "bg-gradient-to-br from-indigo-50/60 via-white to-white",
  },
  "restructuring-insolvency": {
    badge: "bg-amber-50/90 text-amber-950 ring-amber-200/60",
    accent: "border-l-amber-400",
    dot: "bg-amber-500",
    pill: "bg-amber-600 text-white shadow-sm shadow-amber-600/20",
    wash: "bg-gradient-to-br from-amber-50/55 via-white to-white",
  },
  consulting: {
    badge: "bg-teal-50/90 text-teal-950 ring-teal-200/60",
    accent: "border-l-teal-400",
    dot: "bg-teal-500",
    pill: "bg-teal-600 text-white shadow-sm shadow-teal-600/20",
    wash: "bg-gradient-to-br from-teal-50/60 via-white to-white",
  },
};
