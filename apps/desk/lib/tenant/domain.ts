import { cache } from "react";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { DESK_APP_HOST, PRODUCT_WORDMARK } from "@/lib/brand";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

const HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/** Host ohne Port/Protokoll/Pfad, lowercased. */
export function normalizeHostname(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.split("/")[0] ?? value;
  value = value.split(":")[0] ?? value;
  value = value.replace(/\.$/, "");
  if (value.startsWith("www.")) {
    value = value.slice(4);
  }
  return value;
}

export function isReservedAppHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return (
    host === DESK_APP_HOST ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost")
  );
}

export function validateCustomDomain(raw: string): string | null {
  const host = normalizeHostname(raw);
  if (!host) {
    return null;
  }
  if (isReservedAppHost(host)) {
    return "Die Plattform-Domain kann nicht als Kanzlei-Domain gesetzt werden.";
  }
  if (!HOSTNAME_PATTERN.test(host)) {
    return "Domain ungültig (z. B. orga.dr-schneiderbanger.de).";
  }
  return null;
}

export type HostTenant = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  customDomain: string | null;
};

export async function findTenantByCustomDomain(
  hostname: string
): Promise<HostTenant | null> {
  const host = normalizeHostname(hostname);
  if (!host || isReservedAppHost(host)) {
    return null;
  }

  const [row] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      brandName: tenants.brandName,
      customDomain: tenants.customDomain,
    })
    .from(tenants)
    .where(eq(tenants.customDomain, host))
    .limit(1);

  return row ?? null;
}

/** Tenant aus aktuellem Request-Host (Custom-Domain), sonst null. */
export const getRequestHostTenant = cache(async (): Promise<HostTenant | null> => {
  const headerStore = await headers();
  const raw =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerStore.get("host") ||
    "";

  if (!raw) {
    return null;
  }

  return findTenantByCustomDomain(raw);
});

export function hostTenantDisplayBrand(tenant: HostTenant | null): string {
  const custom = tenant?.brandName?.trim();
  return custom || PRODUCT_WORDMARK;
}
