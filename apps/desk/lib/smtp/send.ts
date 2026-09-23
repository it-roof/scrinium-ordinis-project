import dns from "node:dns/promises";
import net from "node:net";

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { SmtpConnectionConfig } from "./types";

type SmtpTransportOptions = SMTPTransport.Options;

/**
 * Nodemailer-`family` wird beim Connect oft nicht durchgereicht.
 * Deshalb: IPv4 per dns.lookup, dann Connect auf die IP + TLS-SNI = Hostname.
 */
export async function resolveSmtpConnectHost(hostname: string): Promise<{
  connectHost: string;
  servername: string;
}> {
  const servername = hostname.trim();
  if (!servername) {
    throw new Error("SMTP-Host fehlt.");
  }

  if (net.isIPv4(servername)) {
    return { connectHost: servername, servername };
  }

  if (net.isIPv6(servername)) {
    throw new Error(
      "IPv6-SMTP-Hosts werden nicht unterstützt. Bitte Hostnamen oder IPv4-Adresse nutzen."
    );
  }

  const { address } = await dns.lookup(servername, { family: 4 });
  return { connectHost: address, servername };
}

export async function createSmtpTransport(config: {
  host: string;
  port: number;
  username: string;
  password: string;
}) {
  const { connectHost, servername } = await resolveSmtpConnectHost(config.host);
  const secure = config.port === 465;

  const options: SmtpTransportOptions = {
    host: connectHost,
    port: config.port,
    secure,
    // Port 587: STARTTLS (u. a. Microsoft 365)
    requireTLS: !secure && config.port === 587,
    tls: {
      // Zertifikat/SNI müssen zum Hostnamen passen, nicht zur IP
      servername,
    },
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
  };

  return {
    transport: nodemailer.createTransport(options),
    connectHost,
    servername,
  };
}

function formatFrom(config: SmtpConnectionConfig) {
  const name = config.fromName.trim();
  if (!name) {
    return config.fromEmail;
  }
  return `"${name.replace(/"/g, "")}" <${config.fromEmail}>`;
}

/** Kurze, nutzbare Meldung ohne Secrets. */
export function formatSmtpError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Testmail konnte nicht gesendet werden. Bitte SMTP-Daten prüfen.";
  }

  const err = error as {
    code?: string;
    errno?: string | number;
    responseCode?: number;
    response?: string;
    message?: string;
    command?: string;
  };

  const code = String(err.code ?? err.errno ?? "").toUpperCase();
  const message = (err.message ?? "").toLowerCase();

  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKETTIMEDOUT" ||
    code === "ETIMEOUT" ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return (
      "Verbindung zum SMTP-Server abgebrochen (Timeout). " +
      "Lokal funktioniert oft IPv4 — auf dem Server prüfen, ob ausgehende Ports 465/587 " +
      "offen sind (Coolify/Hetzner-Firewall). Sonst Port 587 (STARTTLS) versuchen."
    );
  }

  if (
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "ENOTFOUND"
  ) {
    return (
      "SMTP-Server nicht erreichbar. Host und Port prüfen " +
      "(häufig: ausgehender SMTP vom Hosting blockiert)."
    );
  }

  if (code === "EAUTH" || err.responseCode === 535) {
    return "SMTP-Anmeldung fehlgeschlagen. Benutzername und Passwort prüfen.";
  }

  const parts: string[] = [];

  if (err.responseCode) {
    parts.push(`SMTP ${err.responseCode}`);
  } else if (err.code) {
    parts.push(err.code);
  }

  const detail =
    (typeof err.response === "string" && err.response.trim()) ||
    (typeof err.message === "string" && err.message.trim()) ||
    "";

  if (detail) {
    const cleaned = detail
      .replace(/pass(?:word)?[=:].*/gi, "[redacted]")
      .slice(0, 240);
    parts.push(cleaned);
  }

  if (parts.length === 0) {
    return "Testmail konnte nicht gesendet werden. Bitte SMTP-Daten prüfen.";
  }

  return parts.join(": ");
}

export async function sendTestEmail(
  config: SmtpConnectionConfig,
  toEmail: string
): Promise<void> {
  const { transport, connectHost, servername } =
    await createSmtpTransport(config);

  console.info("[smtp:connect]", {
    host: servername,
    connectHost,
    port: config.port,
  });

  await transport.sendMail({
    from: formatFrom(config),
    to: toEmail,
    subject: "Scrinium Ordinis — SMTP-Test",
    text: [
      "Diese Testmail bestätigt, dass dein SMTP-Konto in Scrinium Ordinis funktioniert.",
      "",
      `Absender: ${config.fromName} <${config.fromEmail}>`,
      `Server: ${config.host}:${config.port}`,
    ].join("\n"),
  });
}

/** Kopie an die Login-E-Mail des Nutzers nach erfolgreichem Versand. */
export async function sendSentEmailCopyToSelf(
  config: SmtpConnectionConfig,
  input: {
    copyTo: string;
    to: string;
    cc?: string;
    subject: string;
    text: string;
  }
): Promise<void> {
  const self = input.copyTo.trim();
  if (!self || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(self)) {
    return;
  }

  const originalSubject = input.subject.trim() || "Ohne Betreff";
  const copyText = [
    "E-Mail versendet:",
    "",
    `An: ${input.to}`,
    ...(input.cc?.trim() ? [`Kopie (CC): ${input.cc.trim()}`] : []),
    `Betreff: ${originalSubject}`,
    "",
    "---",
    "",
    input.text,
  ].join("\n");

  await sendMailWithUserSmtp(config, {
    to: self,
    subject: `E-Mail versendet: ${originalSubject}`,
    text: copyText,
  });
}

/** Später: Mandanten-Mails. Export für Wiederverwendung. */
export async function sendMailWithUserSmtp(
  config: SmtpConnectionConfig,
  input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    cc?: string;
  }
): Promise<void> {
  const { transport } = await createSmtpTransport(config);
  const cc = input.cc?.trim();

  await transport.sendMail({
    from: formatFrom(config),
    to: input.to,
    ...(cc ? { cc } : {}),
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
