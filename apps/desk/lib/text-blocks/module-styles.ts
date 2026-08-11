import type { ContentModule } from "./types";

export const moduleStyles: Record<
  ContentModule,
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
    badge: "bg-lime-50/90 text-lime-950 ring-lime-200/60",
    accent: "border-l-lime-400",
    dot: "bg-lime-500",
    pill: "bg-lime-600 text-white shadow-sm shadow-lime-600/20",
    wash: "bg-gradient-to-br from-lime-50/70 via-white to-white",
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
    badge: "bg-rose-50/90 text-rose-950 ring-rose-200/60",
    accent: "border-l-rose-400",
    dot: "bg-rose-500",
    pill: "bg-rose-600 text-white shadow-sm shadow-rose-600/20",
    wash: "bg-gradient-to-br from-rose-50/60 via-white to-white",
  },
};
