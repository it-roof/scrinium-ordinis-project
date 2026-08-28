"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/tenant/session";

import { formatSmtpError, sendTestEmail } from "./send";
import {
  getUserSmtpConnectionConfig,
  getUserSmtpSettingsPublic,
  resolvePasswordEncrypted,
  upsertUserSmtpSettings,
} from "./storage";
import type { UserSmtpSettingsInput, UserSmtpSettingsPublic } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validateSmtpInput(input: UserSmtpSettingsInput): string | null {
  const host = input.host.trim();
  const username = input.username.trim();
  const fromName = input.fromName.trim();
  const fromEmail = input.fromEmail.trim().toLowerCase();
  const password = input.password?.trim() ?? "";
  const port = input.port;

  const hasAnything =
    Boolean(host) ||
    Boolean(username) ||
    Boolean(fromName) ||
    Boolean(fromEmail) ||
    Boolean(password) ||
    port != null;

  if (!hasAnything) {
    return "Bitte mindestens ein Feld ausfüllen.";
  }

  if (port != null && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    return "Port muss zwischen 1 und 65535 liegen.";
  }

  if (fromEmail && !EMAIL_PATTERN.test(fromEmail)) {
    return "Bitte eine gültige Absender-E-Mail angeben.";
  }

  return null;
}

export async function getMySmtpSettingsAction(): Promise<
  UserSmtpSettingsPublic | null
> {
  const user = await requireSessionUser();
  if (!user) {
    return null;
  }

  return getUserSmtpSettingsPublic(user.tenantId, user.id);
}

export async function saveMySmtpSettingsAction(input: UserSmtpSettingsInput) {
  const user = await requireSessionUser();
  if (!user) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  const fieldError = validateSmtpInput(input);
  if (fieldError) {
    return { success: false as const, error: fieldError };
  }

  const { passwordEncrypted } = await resolvePasswordEncrypted(
    user.tenantId,
    user.id,
    input.password
  );

  const item = await upsertUserSmtpSettings(user.tenantId, user.id, {
    host: emptyToNull(input.host),
    port: input.port,
    username: emptyToNull(input.username),
    fromName: emptyToNull(input.fromName),
    fromEmail: emptyToNull(input.fromEmail.toLowerCase()),
    passwordEncrypted,
  });

  revalidatePath("/einstellungen");

  return { success: true as const, item };
}

export async function sendMySmtpTestEmailAction(input?: { to?: string }) {
  const user = await requireSessionUser();
  if (!user) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  const to =
    input?.to?.trim().toLowerCase() || user.email?.trim().toLowerCase() || "";

  if (!to || !EMAIL_PATTERN.test(to)) {
    return {
      success: false as const,
      error: "Bitte eine gültige Empfänger-E-Mail angeben.",
    };
  }

  const config = await getUserSmtpConnectionConfig(user.tenantId, user.id);
  if (!config) {
    return {
      success: false as const,
      error:
        "Für den Testversand fehlen noch Angaben (Host, Port, Benutzer, Passwort und Absender-E-Mail).",
    };
  }

  try {
    await sendTestEmail(config, to);
  } catch (error) {
    console.error("[smtp:test]", {
      host: config.host,
      port: config.port,
      username: config.username,
      fromEmail: config.fromEmail,
      to,
      error,
    });
    return {
      success: false as const,
      error: formatSmtpError(error),
    };
  }

  return { success: true as const, to };
}
