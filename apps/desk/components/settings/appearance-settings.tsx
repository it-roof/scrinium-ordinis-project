"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import {
  useLabTheme,
  type LabAppearance,
} from "@/components/neues-design/lab-theme";

const OPTIONS: ReadonlyArray<{
  id: LabAppearance;
  label: string;
  hint: string;
  Icon: typeof SunIcon;
}> = [
  {
    id: "light",
    label: "Hell",
    hint: "Helles Arbeitsflächen-Design",
    Icon: SunIcon,
  },
  {
    id: "dark",
    label: "Dunkel",
    hint: "Dunkles Arbeitsflächen-Design",
    Icon: MoonIcon,
  },
];

export function AppearanceSettings() {
  const { appearance, setAppearance } = useLabTheme();

  return (
    <section className="surface-card space-y-4 p-5 md:p-6">
      <div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Design
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hell oder Dunkel für die Desk-Oberfläche.
        </p>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-2"
        role="group"
        aria-label="Design"
      >
        {OPTIONS.map((opt) => {
          const active = appearance === opt.id;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAppearance(opt.id)}
              aria-pressed={active}
              className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors"
              style={
                active
                  ? {
                      borderColor: "var(--b-ink)",
                      background: "var(--b-soft)",
                      color: "var(--b-ink)",
                    }
                  : {
                      borderColor: "var(--b-line)",
                      background: "var(--b-bg)",
                      color: "var(--b-ink)",
                    }
              }
            >
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: active ? "var(--b-ink)" : "var(--b-soft)",
                  color: active ? "var(--b-bg-elev)" : "var(--b-muted)",
                }}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold">
                  {opt.label}
                </span>
                <span
                  className="mt-0.5 block text-[0.8125rem] leading-snug"
                  style={{ color: "var(--b-muted)" }}
                >
                  {opt.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
