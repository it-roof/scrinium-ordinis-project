import type { UserSmtpSettingsPublic } from "./types";

/** Anzeige für „Von:“ im E-Mail-Editor. */
export function formatSmtpSenderDisplay(
  settings: Pick<UserSmtpSettingsPublic, "fromName" | "fromEmail"> | null | undefined
): string {
  if (!settings?.fromEmail?.trim()) {
    return "SMTP in Einstellungen hinterlegen";
  }
  const email = settings.fromEmail.trim();
  const name = settings.fromName.trim();
  return name ? `${name} <${email}>` : email;
}
