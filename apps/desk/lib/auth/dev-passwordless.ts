/**
 * Local-only: login with email only (no password check).
 * Hard-blocked when NODE_ENV=production — even if the env flag is set.
 */
export function isDevPasswordlessLoginEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const v = process.env.AUTH_DEV_PASSWORDLESS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
