export function isMaintenanceMode(): boolean {
  const value = process.env.WARTUNG?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}
