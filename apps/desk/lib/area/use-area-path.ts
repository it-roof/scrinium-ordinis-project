"use client";

import { usePathname } from "next/navigation";

import {
  parseAreaBasePath,
  parseAreaFromPathname,
} from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";

/** Basis-Pfad der aktuellen Practice, z. B. /r */
export function useAreaBasePath(): string | null {
  const pathname = usePathname();
  return parseAreaBasePath(pathname);
}

export function useAreaFromPath(): AppModuleId | null {
  const pathname = usePathname();
  return parseAreaFromPathname(pathname);
}
