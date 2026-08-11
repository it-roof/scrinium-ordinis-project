import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ACTIVE_AREA_COOKIE } from "@/lib/area/active-area";
import {
  homeAreaForFunction,
  isFunctionAvailableInArea,
  type AreaFunctionId,
} from "@/lib/area/functions";
import {
  areaBasePath,
  areaFromSlug,
  slugForArea,
} from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";
import { getTenantEnabledModules } from "@/lib/tenant/modules";
import { requireTenantUser } from "@/lib/tenant/session";

/** Bereich aus URL-Slug laden und Tenant-Freigabe prüfen. */
export async function requireAreaFromSlug(areaSlug: string): Promise<{
  user: Awaited<ReturnType<typeof requireTenantUser>>;
  area: AppModuleId;
  enabledModules: AppModuleId[];
  basePath: string;
}> {
  const user = await requireTenantUser();
  const area = areaFromSlug(areaSlug);

  if (!area) {
    notFound();
  }

  const enabledModules = await getTenantEnabledModules(user.tenantId);

  if (!enabledModules.includes(area)) {
    redirect("/");
  }

  const canonicalSlug = slugForArea(area);
  if (areaSlug !== canonicalSlug) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    const rest = pathname.replace(/^\/[^/]+/, "") || "";
    redirect(`/${canonicalSlug}${rest}`);
  }

  return {
    user,
    area,
    enabledModules,
    basePath: areaBasePath(area),
  };
}

/** Bereich + Funktion aus URL absichern. */
export async function requireAreaFunction(
  areaSlug: string,
  functionId: AreaFunctionId
) {
  const ctx = await requireAreaFromSlug(areaSlug);

  if (!isFunctionAvailableInArea(functionId, ctx.area)) {
    redirect(ctx.basePath);
  }

  return ctx;
}

/** Legacy-Flat-Route → Bereichs-URL. */
export async function redirectLegacyFunction(
  functionId: AreaFunctionId,
  suffix = ""
) {
  const user = await requireTenantUser();
  const enabledModules = await getTenantEnabledModules(user.tenantId);
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_AREA_COOKIE)?.value;

  const home = homeAreaForFunction(functionId);

  let area: AppModuleId | null = null;
  if (raw && enabledModules.includes(raw as AppModuleId)) {
    const candidate = raw as AppModuleId;
    if (isFunctionAvailableInArea(functionId, candidate)) {
      area = candidate;
    }
  }

  area = area ?? (home && enabledModules.includes(home) ? home : null);

  if (!area) {
    redirect("/");
  }

  redirect(`${areaBasePath(area)}${suffix}`);
}

export function areaSlugParam(area: AppModuleId): string {
  return slugForArea(area);
}
