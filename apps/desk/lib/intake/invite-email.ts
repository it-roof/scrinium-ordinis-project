import { PRODUCT_NAME } from "@scrinium/brand";

/**
 * HTML-Mail für Mandats-Aufnahmebogen.
 * Hell, ruhig, hochwertig — wenig Text, klare Hierarchie.
 * Kanzlei im Vordergrund, Scrinium nur dezent.
 */
export function buildIntakeInviteEmail(input: {
  tenantName: string;
  recipientGreeting: string;
  url: string;
}): { subject: string; text: string; html: string } {
  const tenantRaw = input.tenantName.trim() || "Ihre Kanzlei";
  const greetingRaw = input.recipientGreeting.trim() || "Guten Tag";
  const kanzlei = escapeHtml(tenantRaw);
  const greeting = escapeHtml(greetingRaw);
  const url = escapeHtml(input.url);
  const product = escapeHtml(PRODUCT_NAME);

  const subject = `${tenantRaw} — Mandats-Aufnahmebogen`;

  const text = [
    greetingRaw + ",",
    "",
    `${tenantRaw} bittet Sie um Ihren Mandats-Aufnahmebogen.`,
    "",
    input.url,
    "",
    "Der Link ist 30 Tage gültig.",
    "",
    `— ${PRODUCT_NAME}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="de" style="color-scheme:light only;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style>
    :root { color-scheme: light only; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f3f0;color:#1b1b1a;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;padding:48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td style="padding:0 0 28px 0;text-align:left;">
              <p style="margin:0;font-family:Manrope,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#9a958c;">
                ${product}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:4px;padding:40px 36px 36px 36px;">
              <p style="margin:0;font-family:Manrope,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.4;letter-spacing:0.04em;text-transform:uppercase;color:#8a857c;">
                Mandats-Aufnahmebogen
              </p>
              <p style="margin:18px 0 0 0;font-family:Manrope,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:28px;line-height:1.15;font-weight:500;letter-spacing:-0.03em;color:#1b1b1a;">
                ${kanzlei}
              </p>
              <p style="margin:28px 0 0 0;font-family:Manrope,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;font-weight:400;color:#1b1b1a;">
                ${greeting},
              </p>
              <p style="margin:12px 0 0 0;font-family:Manrope,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#5c5954;">
                bitte füllen Sie Ihren Aufnahmebogen aus. Das dauert nur wenige Minuten.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:36px 0 0 0;">
                <tr>
                  <td style="border-radius:999px;background:#1b1b1a;">
                    <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:Manrope,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.02em;color:#fbfaf8;text-decoration:none;">
                      Formular öffnen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0 0;font-family:Manrope,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9a958c;">
                30 Tage gültig · Bei Fragen einfach auf diese E-Mail antworten
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
