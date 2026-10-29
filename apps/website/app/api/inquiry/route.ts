import { NextResponse } from "next/server";

export const runtime = "nodejs";

type InquiryBody = {
  name?: string;
  firm?: string;
  email?: string;
  phone?: string;
  participants?: number;
  format?: string;
  duration?: string;
  preferredDate?: string;
  alternativeDate?: string;
  timePreference?: string;
  location?: string;
  contactPreference?: string;
  message?: string;
  totalLabel?: string;
  pricePerParticipant?: number;
  travelNote?: string | null;
  source?: string;
  website?: string; // honeypot
};

type InquiryPayload = {
  name: string;
  firm: string;
  email: string;
  phone: string;
  participants: number;
  format: string;
  duration: string;
  preferredDate: string;
  alternativeDate: string;
  timePreference: string;
  location: string;
  contactPreference: string;
  message: string;
  totalLabel: string;
  travelNote: string | null;
  source: string;
};

function trim(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function buildMailto(payload: InquiryPayload): string {
  const lines = [
    "Guten Tag,",
    "",
    "hiermit sende ich eine unverbindliche Anfrage zur KI-Schulung für Rechtsanwälte und bitte um Terminvorschläge.",
    "",
    "— Kontaktdaten —",
    `Name: ${payload.name}`,
    `Kanzlei: ${payload.firm}`,
    `E-Mail: ${payload.email}`,
    payload.phone ? `Telefon: ${payload.phone}` : null,
    `Rückruf / Kontakt: ${payload.contactPreference}`,
    "",
    "— Angebot —",
    `Teilnehmerzahl: ${payload.participants}`,
    `Format: ${payload.format}`,
    `Dauer: ${payload.duration}`,
    `Kalkulierte Summe: ${payload.totalLabel}`,
    payload.travelNote ? `Hinweis: ${payload.travelNote}` : null,
    payload.location ? `Ort / Standort: ${payload.location}` : null,
    "",
    "— Terminwunsch —",
    `1. Wunschtermin: ${payload.preferredDate || "flexibel — bitte Termine vorschlagen"}`,
    payload.alternativeDate
      ? `2. Alternativtermin: ${payload.alternativeDate}`
      : null,
    `Tageszeit: ${payload.timePreference}`,
    "",
    payload.message ? `Nachricht:\n${payload.message}` : null,
    "",
    "Mit freundlichen Grüßen",
    payload.name,
  ].filter((line): line is string => line !== null);

  const subject = encodeURIComponent(
    `Anfrage KI-Schulung – ${payload.firm} (${payload.participants} TN)`,
  );
  const body = encodeURIComponent(lines.join("\n"));
  const to =
    process.env.INQUIRY_TO_EMAIL?.trim() || "hello@scrinium-ordinis.de";
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

function buildText(payload: InquiryPayload): string {
  return [
    "Neue Anfrage – KI-Schulung Rechtsanwalt",
    "",
    "Kontaktdaten",
    `Name: ${payload.name}`,
    `Kanzlei: ${payload.firm}`,
    `E-Mail: ${payload.email}`,
    `Telefon: ${payload.phone || "—"}`,
    `Kontaktwunsch: ${payload.contactPreference}`,
    "",
    "Angebot",
    `Teilnehmer: ${payload.participants}`,
    `Format: ${payload.format}`,
    `Dauer: ${payload.duration}`,
    `Summe: ${payload.totalLabel}`,
    `Fahrtkosten: ${payload.travelNote || "nicht zutreffend (Online)"}`,
    `Ort: ${payload.location || "—"}`,
    "",
    "Terminwunsch",
    `1. Wunschtermin: ${payload.preferredDate || "flexibel"}`,
    `2. Alternativtermin: ${payload.alternativeDate || "—"}`,
    `Tageszeit: ${payload.timePreference}`,
    "",
    "Nachricht:",
    payload.message || "—",
    "",
    `Quelle: ${payload.source}`,
  ].join("\n");
}

export async function POST(request: Request) {
  let body: InquiryBody;
  try {
    body = (await request.json()) as InquiryBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültige Anfrage." },
      { status: 400 },
    );
  }

  // Honeypot
  if (trim(body.website)) {
    return NextResponse.json({ ok: true, delivery: "ignored" });
  }

  const name = trim(body.name, 120);
  const firm = trim(body.firm, 160);
  const email = trim(body.email, 160).toLowerCase();
  const phone = trim(body.phone, 60);
  const format = trim(body.format, 40);
  const duration = trim(body.duration, 40);
  const preferredDate = trim(body.preferredDate, 160);
  const alternativeDate = trim(body.alternativeDate, 160);
  const timePreference = trim(body.timePreference, 80) || "Flexibel";
  const location = trim(body.location, 160);
  const contactPreference = trim(body.contactPreference, 80) || "E-Mail";
  const message = trim(body.message, 2000);
  const totalLabel = trim(body.totalLabel, 240) || "—";
  const travelNote = body.travelNote ? trim(body.travelNote, 240) : null;
  const source = trim(body.source, 120) || "website";
  const participants = Number(body.participants);

  if (!name || !firm || !email || !format || !duration) {
    return NextResponse.json(
      { ok: false, error: "Bitte Pflichtfelder ausfüllen." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Bitte eine gültige E-Mail angeben." },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(participants) ||
    participants < 1 ||
    participants > 50
  ) {
    return NextResponse.json(
      { ok: false, error: "Teilnehmerzahl ungültig." },
      { status: 400 },
    );
  }

  const payload: InquiryPayload = {
    name,
    firm,
    email,
    phone,
    participants,
    format,
    duration,
    preferredDate,
    alternativeDate,
    timePreference,
    location,
    contactPreference,
    message,
    totalLabel,
    travelNote,
    source,
  };

  const mailto = buildMailto(payload);
  const text = buildText(payload);
  const to =
    process.env.INQUIRY_TO_EMAIL?.trim() || "hello@scrinium-ordinis.de";
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.INQUIRY_FROM_EMAIL?.trim() ||
    "Scrinium <onboarding@resend.dev>";

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: email,
          subject: `Anfrage KI-Schulung – ${firm} (${participants} TN)`,
          text,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        console.error("[inquiry] Resend failed:", detail);
        return NextResponse.json({
          ok: true,
          delivery: "mailto",
          mailto,
          warning:
            "E-Mail-Versand nicht möglich — bitte über Ihr Mailprogramm senden.",
        });
      }

      return NextResponse.json({ ok: true, delivery: "email" });
    } catch (error) {
      console.error("[inquiry] Resend error:", error);
      return NextResponse.json({
        ok: true,
        delivery: "mailto",
        mailto,
        warning:
          "E-Mail-Versand nicht möglich — bitte über Ihr Mailprogramm senden.",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    delivery: "mailto",
    mailto,
  });
}
