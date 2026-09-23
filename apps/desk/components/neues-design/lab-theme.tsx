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

export type LabAppearance = "light" | "dark";

type LabThemeContextValue = {
  appearance: LabAppearance;
  setAppearance: (value: LabAppearance) => void;
  toggleAppearance: () => void;
};

const LabThemeContext = createContext<LabThemeContextValue | null>(null);

const STORAGE_KEY = "desk-neues-design-appearance";

export function LabThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<LabAppearance>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      setAppearanceState(stored);
    }
    setReady(true);
  }, []);

  const setAppearance = useCallback((value: LabAppearance) => {
    setAppearanceState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }, []);

  const toggleAppearance = useCallback(() => {
    setAppearanceState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ appearance, setAppearance, toggleAppearance }),
    [appearance, setAppearance, toggleAppearance]
  );

  if (!ready) {
    return (
      <LabThemeContext.Provider value={value}>
        <div data-lab-appearance="light">{children}</div>
      </LabThemeContext.Provider>
    );
  }

  return (
    <LabThemeContext.Provider value={value}>
      <div data-lab-appearance={appearance}>{children}</div>
    </LabThemeContext.Provider>
  );
}

export function useLabTheme() {
  const ctx = useContext(LabThemeContext);
  if (!ctx) {
    throw new Error("useLabTheme must be used within LabThemeProvider");
  }
  return ctx;
}
