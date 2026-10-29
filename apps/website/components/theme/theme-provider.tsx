"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Appearance = "light" | "dark";

type ThemeContextValue = {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  toggleAppearance: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const APPEARANCE_STORAGE_KEY = "website-appearance";

function applyAppearanceClass(value: Appearance) {
  document.documentElement.classList.toggle("dark", value === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      setAppearanceState(stored);
      applyAppearanceClass(stored);
    }
  }, []);

  const setAppearance = useCallback((value: Appearance) => {
    setAppearanceState(value);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, value);
    applyAppearanceClass(value);
  }, []);

  const toggleAppearance = useCallback(() => {
    setAppearanceState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
      applyAppearanceClass(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ appearance, setAppearance, toggleAppearance }),
    [appearance, setAppearance, toggleAppearance],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
