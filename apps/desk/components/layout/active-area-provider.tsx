"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import {
  type ActiveArea,
  parseActiveArea,
  writeActiveAreaCookie,
} from "@/lib/area/active-area";
import { parseAreaFromPathname } from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";

type ActiveAreaContextValue = {
  activeArea: ActiveArea;
  setActiveArea: (area: ActiveArea) => void;
  allowedAreas: readonly AppModuleId[];
};

const ActiveAreaContext = createContext<ActiveAreaContextValue | null>(null);

export function ActiveAreaProvider({
  initialActiveArea,
  allowedAreas,
  children,
}: {
  initialActiveArea: ActiveArea;
  allowedAreas: readonly AppModuleId[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeArea, setActiveAreaState] = useState<ActiveArea>(() =>
    parseActiveArea(initialActiveArea, allowedAreas)
  );

  useEffect(() => {
    const fromPath = parseAreaFromPathname(pathname);
    if (fromPath && allowedAreas.includes(fromPath)) {
      setActiveAreaState(fromPath);
      writeActiveAreaCookie(fromPath);
    }
  }, [pathname, allowedAreas]);

  const setActiveArea = useCallback(
    (area: ActiveArea) => {
      const next = parseActiveArea(area, allowedAreas);
      setActiveAreaState(next);
      writeActiveAreaCookie(next);
    },
    [allowedAreas]
  );

  const value = useMemo(
    () => ({
      activeArea,
      setActiveArea,
      allowedAreas,
    }),
    [activeArea, setActiveArea, allowedAreas]
  );

  return (
    <ActiveAreaContext.Provider value={value}>
      {children}
    </ActiveAreaContext.Provider>
  );
}

export function useActiveArea(): ActiveAreaContextValue {
  const ctx = useContext(ActiveAreaContext);
  if (!ctx) {
    throw new Error("useActiveArea must be used within ActiveAreaProvider");
  }
  return ctx;
}

/** Optional: ohne Provider (z. B. Plattform) → null. */
export function useOptionalActiveArea(): ActiveAreaContextValue | null {
  return useContext(ActiveAreaContext);
}
