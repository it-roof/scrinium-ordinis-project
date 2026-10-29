"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type Appearance = "light" | "dark";

const STORAGE_KEY = "matters-appearance";

type ThemeContextValue = {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyAppearance(value: Appearance) {
  document.documentElement.classList.toggle("dark", value === "dark");
  window.localStorage.setItem(STORAGE_KEY, value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored === "dark" || stored === "light" ? stored : "light";
    setAppearanceState(next);
    applyAppearance(next);
  }, []);

  const setAppearance = useCallback((value: Appearance) => {
    setAppearanceState(value);
    applyAppearance(value);
  }, []);

  return (
    <ThemeContext.Provider value={{ appearance, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme braucht ThemeProvider.");
  }
  return value;
}

export function ThemeSwitch() {
  const { appearance, setAppearance } = useTheme();

  return (
    <div
      className="flex rounded-md bg-foreground/[0.05] p-px"
      role="group"
      aria-label="Erscheinungsbild"
    >
      {(
        [
          { id: "light" as const, label: "Hell" },
          { id: "dark" as const, label: "Dunkel" },
        ] as const
      ).map((option) => {
        const active = appearance === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setAppearance(option.id)}
            className={cn(
              "h-6 flex-1 rounded-[5px] text-[11px] transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
