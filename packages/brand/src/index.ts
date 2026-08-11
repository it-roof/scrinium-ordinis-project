/** Produktmarke (Desk + Website) */
export const PRODUCT_NAME = "Scrinium Ordinis";
export const PRODUCT_WORDMARK = "Scrinium Ordinis";

export const PRODUCT_TAGLINE =
  "Kanzlei-Werkzeug für Dokumentation, Textbausteine und Arbeitsfunktionen.";

/** Öffentliche Desk-App (Produktion / Coolify) */
export const DESK_APP_HOST = "app.scrinium-ordinis.de";
export const DESK_APP_URL = `https://${DESK_APP_HOST}`;

/** @deprecated Prefer tenant.name from DB — kept for UI fallbacks. */
export const KANZLEI_NAME = "Dr. Schneiderbanger & Kollegen";

/** Alias — gleiche Marke wie Produkt */
export const SITE_NAME = PRODUCT_NAME;
export const SITE_TAGLINE = PRODUCT_TAGLINE;

/** Seed / Default-Tenant (erste Kunden-Kanzlei auf der Plattform) */
export const DEFAULT_TENANT_NAME = "Dr. Schneiderbanger & Kollegen";
export const DEFAULT_TENANT_SLUG = "schneiderbanger";
