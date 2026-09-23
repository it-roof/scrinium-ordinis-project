/**
 * Pure consent status helpers — safe to unit-test without DB / server-only.
 */

export type ConsentStatusView = "none" | "granted" | "revoked";

export type ConsentStatusSource = {
  status: "granted" | "revoked";
} | null;

export function consentStatusView(
  consent: ConsentStatusSource
): ConsentStatusView {
  if (!consent) return "none";
  return consent.status === "granted" ? "granted" : "revoked";
}

/** Server gate: only "granted" allows AI calls. */
export function isAiConsentGranted(consent: ConsentStatusSource): boolean {
  return consent?.status === "granted";
}
