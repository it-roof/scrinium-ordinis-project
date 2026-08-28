import nodemailer from "nodemailer";

import { DESK_APP_URL } from "@scrinium/brand";

type MailConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

/**
 * Transaktionsmail (Passwort-Reset usw.) — Env nach gängiger Praxis:
 * MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM
 */
function readMailConfig(): MailConfig | null {
  const host = process.env.MAIL_HOST?.trim();
  const portRaw = process.env.MAIL_PORT?.trim();
  const user = process.env.MAIL_USER?.trim();
  const password = process.env.MAIL_PASSWORD?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (!host || !portRaw || !user || !password || !from) {
    return null;
  }

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return { host, port, user, password, from };
}

export function isSystemMailConfigured(): boolean {
  return readMailConfig() !== null;
}

export function getAppBaseUrl(): string {
  const fromEnv = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  return fromEnv || DESK_APP_URL;
}

export async function sendSystemMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = readMailConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "E-Mail-Versand ist nicht konfiguriert (MAIL_*). Bitte Support kontaktieren.",
    };
  }

  const secure = config.port === 465;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure && config.port === 587,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  try {
    await transport.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true };
  } catch (error) {
    console.error("[system-mail]", error);
    return {
      ok: false,
      error: "E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.",
    };
  }
}
