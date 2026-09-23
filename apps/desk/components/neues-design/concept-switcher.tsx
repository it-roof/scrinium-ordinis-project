"use client";

import Link from "next/link";

import {
  DESIGN_CONCEPTS,
  type DesignConceptId,
} from "@/components/neues-design/concepts";
import { useLabTheme } from "@/components/neues-design/lab-theme";

export function ConceptSwitcher({ active }: { active: DesignConceptId }) {
  const current = DESIGN_CONCEPTS.find((c) => c.id === active)!;
  const { appearance, setAppearance } = useLabTheme();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex justify-center p-3 pb-5">
      <div
        className="pointer-events-auto w-full max-w-4xl rounded-2xl border px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--b-bg-elev) 94%, transparent)",
          borderColor: "var(--b-line)",
          color: "var(--b-ink)",
        }}
      >
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.9375rem] font-semibold tracking-tight">
              {current.brand}
              <span style={{ color: "var(--b-muted)" }}> · Design-Lab</span>
            </p>
            <p className="mt-0.5 text-[0.8125rem]" style={{ color: "var(--b-muted)" }}>
              {current.fonts}
            </p>
          </div>

          <div
            className="flex items-center rounded-full p-0.5"
            style={{
              background: "var(--b-bg)",
              border: "1px solid var(--b-line)",
            }}
            role="group"
            aria-label="Erscheinungsbild"
          >
            {(
              [
                { id: "light" as const, label: "Hell" },
                { id: "dark" as const, label: "Dunkel" },
              ] as const
            ).map((opt) => {
              const isActive = appearance === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAppearance(opt.id)}
                  className="min-h-9 rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-colors"
                  style={
                    isActive
                      ? {
                          background: "var(--b-ink)",
                          color: "var(--b-bg-elev)",
                        }
                      : { color: "var(--b-muted)" }
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DESIGN_CONCEPTS.map((c) => {
            const isActive = c.id === active;
            return (
              <Link
                key={c.id}
                href={`/neues-design/${c.id}`}
                className="min-h-9 rounded-full px-3.5 py-2 text-[0.8125rem] font-semibold transition-colors"
                style={
                  isActive
                    ? {
                        background: "var(--b-accent)",
                        color: "var(--b-accent-fg)",
                      }
                    : {
                        background: "var(--b-bg)",
                        color: "var(--b-muted)",
                      }
                }
              >
                {c.name}
              </Link>
            );
          })}
        </div>

        <p
          className="mt-2 text-[0.8125rem] leading-relaxed"
          style={{ color: "var(--b-muted)" }}
        >
          {current.thesis}
        </p>
      </div>
    </div>
  );
}
