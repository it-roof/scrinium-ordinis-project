"use client";

import { useMemo, useState } from "react";

import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type PricingCalculatorProps = {
  eyebrow?: string;
  heading: string;
  lead?: string;
  pricePerParticipant: number;
  currencyLabel?: string;
  minParticipants: number;
  maxParticipants: number;
  defaultParticipants?: number;
  unitLabel?: string;
  totalLabel?: string;
  /** MwSt-Satz, z. B. 0.19 — Preis gilt als Netto */
  vatRate?: number;
  vatLabel?: string;
  netLabel?: string;
  grossLabel?: string;
  /** Ab dieser Teilnehmerzahl gilt der Mengenrabatt */
  volumeDiscountFrom?: number;
  /** z. B. 0.1 = 10 % auf die Netto-Summe */
  volumeDiscountRate?: number;
  volumeDiscountLabel?: string;
  includes?: readonly string[];
  notes?: readonly string[];
  formats?: readonly { id: string; label: string }[];
  defaultFormatId?: string;
  durations?: readonly { id: string; label: string }[];
  defaultDurationId?: string;
  /** Hinweis unter der Summe, wenn Format „vor Ort“ gewählt ist */
  onSiteTravelNote?: string;
  onSiteFormatId?: string;
  primaryCta: { href: string; label: string };
  inquirySource?: string;
  className?: string;
};

type InquiryStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; delivery: "email" | "mailto" | "ignored" }
  | { state: "error"; message: string };

type StepId = "angebot" | "kontakt" | "termin" | "pruefen";

const STEPS: readonly { id: StepId; label: string }[] = [
  { id: "angebot", label: "Angebot" },
  { id: "kontakt", label: "Kontakt" },
  { id: "termin", label: "Termin" },
  { id: "pruefen", label: "Prüfen" },
];

function formatEuro(value: number): string {
  const hasCents = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value);
}

const fieldClass =
  "mt-1 w-full rounded-none border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground";

const chipActive =
  "border-foreground bg-foreground text-background";
const chipIdle =
  "border-border text-foreground hover:bg-background";

export function PricingCalculator({
  eyebrow = "Preis",
  heading,
  lead,
  pricePerParticipant,
  currencyLabel = "EUR",
  minParticipants,
  maxParticipants,
  defaultParticipants,
  unitLabel = "pro Teilnehmer",
  totalLabel = "Gesamt netto",
  vatRate = 0.19,
  vatLabel = "MwSt. 19 %",
  netLabel = "netto",
  grossLabel = "Gesamt brutto",
  volumeDiscountFrom = 8,
  volumeDiscountRate = 0.1,
  volumeDiscountLabel = "Mengenrabatt 10 %",
  includes = [],
  notes = [],
  formats = [
    { id: "vor-ort", label: "Vor Ort" },
    { id: "online", label: "Online" },
  ],
  defaultFormatId,
  durations = [
    { id: "halbtag", label: "Halbtag" },
    { id: "tag", label: "Ganzer Tag" },
  ],
  defaultDurationId,
  onSiteTravelNote,
  onSiteFormatId = "vor-ort",
  primaryCta,
  inquirySource = "ki-schulung-preise",
  className,
}: PricingCalculatorProps) {
  const initial = Math.min(
    maxParticipants,
    Math.max(minParticipants, defaultParticipants ?? minParticipants),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [participants, setParticipants] = useState(initial);
  const [formatId, setFormatId] = useState(
    defaultFormatId ?? formats[0]?.id ?? "vor-ort",
  );
  const [durationId, setDurationId] = useState(
    defaultDurationId ?? durations[0]?.id ?? "halbtag",
  );

  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [alternativeDate, setAlternativeDate] = useState("");
  const [timePreference, setTimePreference] = useState("Flexibel");
  const [location, setLocation] = useState("");
  const [contactPreference, setContactPreference] = useState("E-Mail");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [status, setStatus] = useState<InquiryStatus>({ state: "idle" });

  const timeOptions = [
    "Vormittag",
    "Nachmittag",
    "Ganztags",
    "Flexibel",
  ] as const;
  const contactOptions = ["E-Mail", "Telefon", "E-Mail oder Telefon"] as const;

  const listNetTotal = participants * pricePerParticipant;
  const hasVolumeDiscount =
    volumeDiscountRate > 0 && participants >= volumeDiscountFrom;
  const discountAmount = hasVolumeDiscount
    ? Math.round(listNetTotal * volumeDiscountRate * 100) / 100
    : 0;
  const netTotal = Math.round((listNetTotal - discountAmount) * 100) / 100;
  const vatAmount = Math.round(netTotal * vatRate * 100) / 100;
  const grossTotal = Math.round((netTotal + vatAmount) * 100) / 100;
  const vatPerParticipant =
    Math.round(pricePerParticipant * vatRate * 100) / 100;
  const grossPerParticipant =
    Math.round((pricePerParticipant + vatPerParticipant) * 100) / 100;
  const discountPercentLabel = `${Math.round(volumeDiscountRate * 100)} %`;

  const formatLabel =
    formats.find((f) => f.id === formatId)?.label ?? formatId;
  const durationLabel =
    durations.find((d) => d.id === durationId)?.label ?? durationId;
  const isOnSite = formatId === onSiteFormatId;
  const listNetFormatted = formatEuro(listNetTotal);
  const discountFormatted = formatEuro(discountAmount);
  const netFormatted = formatEuro(netTotal);
  const vatFormatted = formatEuro(vatAmount);
  const grossFormatted = formatEuro(grossTotal);

  const step = STEPS[stepIndex] ?? STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const summaryLines = useMemo(
    () => [
      `${participants} Teilnehmer × ${formatEuro(pricePerParticipant)} ${netLabel}`,
      `Format: ${formatLabel}`,
      `Dauer: ${durationLabel}`,
      hasVolumeDiscount
        ? `${volumeDiscountLabel} (ab ${volumeDiscountFrom} TN): −${discountFormatted}`
        : null,
      `Netto: ${netFormatted}`,
      `${vatLabel}: ${vatFormatted}`,
      `Brutto: ${grossFormatted}`,
      isOnSite && onSiteTravelNote ? onSiteTravelNote : null,
      name ? `Name: ${name}` : null,
      firm ? `Kanzlei: ${firm}` : null,
      email ? `E-Mail: ${email}` : null,
      phone ? `Telefon: ${phone}` : null,
      `Kontakt: ${contactPreference}`,
      preferredDate
        ? `1. Wunschtermin: ${preferredDate} (${timePreference})`
        : `Termin: flexibel — wir schlagen Termine vor (${timePreference})`,
      alternativeDate ? `2. Alternativtermin: ${alternativeDate}` : null,
      isOnSite && location ? `Ort: ${location}` : null,
      message ? `Nachricht: ${message}` : null,
    ],
    [
      alternativeDate,
      contactPreference,
      discountFormatted,
      durationLabel,
      email,
      firm,
      formatLabel,
      grossFormatted,
      hasVolumeDiscount,
      isOnSite,
      location,
      message,
      name,
      netFormatted,
      netLabel,
      onSiteTravelNote,
      participants,
      phone,
      preferredDate,
      pricePerParticipant,
      timePreference,
      vatFormatted,
      vatLabel,
      volumeDiscountFrom,
      volumeDiscountLabel,
    ],
  );

  function clamp(next: number) {
    return Math.min(maxParticipants, Math.max(minParticipants, next));
  }

  function validateStep(id: StepId): string | null {
    if (id === "kontakt") {
      if (!name.trim() || !firm.trim() || !email.trim()) {
        return "Bitte Name, Kanzlei und E-Mail ausfüllen.";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return "Bitte eine gültige E-Mail angeben.";
      }
      if (
        (contactPreference === "Telefon" ||
          contactPreference === "E-Mail oder Telefon") &&
        !phone.trim()
      ) {
        return "Bitte Telefonnummer angeben, wenn Sie telefonisch erreichbar sein möchten.";
      }
    }
    return null;
  }

  function goNext() {
    const error = validateStep(step.id);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }

  function goBack() {
    setStepError(null);
    setStatus({ state: "idle" });
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function goToStep(index: number) {
    if (index > stepIndex) {
      for (let i = stepIndex; i < index; i++) {
        const err = validateStep(STEPS[i]!.id);
        if (err) {
          setStepError(err);
          setStepIndex(i);
          return;
        }
      }
    }
    setStepError(null);
    setStepIndex(index);
  }

  async function submitInquiry() {
    if (status.state === "submitting") return;
    const error = validateStep("kontakt");
    if (error) {
      setStepError(error);
      setStepIndex(1);
      return;
    }

    setStatus({ state: "submitting" });
    setStepError(null);

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          firm,
          email,
          phone,
          participants,
          format: formatLabel,
          duration: durationLabel,
          preferredDate,
          alternativeDate,
          timePreference,
          location: isOnSite ? location : "",
          contactPreference,
          message,
          totalLabel: hasVolumeDiscount
            ? `${listNetFormatted} − ${discountPercentLabel} Rabatt = ${netFormatted} netto / ${grossFormatted} brutto (inkl. ${vatLabel} ${vatFormatted})`
            : `${netFormatted} netto / ${grossFormatted} brutto (inkl. ${vatLabel} ${vatFormatted})`,
          pricePerParticipant,
          travelNote: isOnSite ? onSiteTravelNote ?? null : null,
          source: inquirySource,
          website: honeypot,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        delivery?: "email" | "mailto" | "ignored";
        mailto?: string;
      };

      if (!res.ok || !data.ok) {
        setStatus({
          state: "error",
          message: data.error ?? "Anfrage konnte nicht gesendet werden.",
        });
        return;
      }

      if (data.delivery === "mailto" && data.mailto) {
        window.location.href = data.mailto;
      }

      setStatus({
        state: "success",
        delivery: data.delivery ?? "mailto",
      });
    } catch {
      setStatus({
        state: "error",
        message: "Netzwerkfehler — bitte erneut versuchen.",
      });
    }
  }

  function resetForm() {
    setStatus({ state: "idle" });
    setStepIndex(0);
    setStepError(null);
  }

  return (
    <SectionFrame className={cn("px-6 py-14 sm:px-10 sm:py-20", className)}>
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.15fr] lg:items-start lg:gap-12">
        <div>
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <DisplayHeading className="mt-3 max-w-lg text-[clamp(1.65rem,3.5vw,2.5rem)] leading-[1.08] tracking-[-0.025em]">
            {heading}
          </DisplayHeading>
          {lead ? (
            <p className="mt-3 max-w-md text-[0.95rem] leading-[1.55] text-muted-foreground">
              {lead}
            </p>
          ) : null}

          <div className="mt-6 border-t border-border pt-5">
            <p className="font-heading text-[clamp(2.25rem,6vw,3.25rem)] leading-none tracking-[-0.04em] text-foreground">
              {formatEuro(pricePerParticipant)}
            </p>
            <p className="mt-1.5 text-xs tracking-[0.04em] text-muted-foreground uppercase">
              {unitLabel} · {netLabel}
              {currencyLabel ? ` · ${currencyLabel}` : null}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-1.5">
                <dt className="text-muted-foreground">{vatLabel}</dt>
                <dd className="tabular-nums text-foreground">
                  {formatEuro(vatPerParticipant)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 pt-0.5">
                <dt className="text-muted-foreground">Brutto {unitLabel}</dt>
                <dd className="font-heading text-base tabular-nums tracking-tight text-foreground">
                  {formatEuro(grossPerParticipant)}
                </dd>
              </div>
            </dl>
          </div>

          {includes.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {includes.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-sm leading-snug text-foreground/90"
                >
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {notes.length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {notes.map((note) => (
                <li
                  key={note}
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div
          data-slot="pricing-calculator"
          className="border border-border bg-muted/25 p-4 sm:p-5"
        >
          <p className="text-[0.65rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Anfrage in {STEPS.length} Schritten
          </p>
          <p className="mt-1.5 text-sm leading-snug text-foreground">
            Angebot kalkulieren, Kontakt und Terminwunsch — wir melden uns mit
            Vorschlag.
          </p>

          {status.state === "success" ? (
            <div className="mt-5 border border-border bg-background p-4">
              <p className="font-heading text-lg tracking-tight">
                Anfrage vorbereitet
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {status.delivery === "email"
                  ? "Vielen Dank. Wir haben Ihre Anfrage erhalten und melden uns mit Terminvorschlag."
                  : "Ihr E-Mail-Programm sollte sich mit einer fertigen Anfrage geöffnet haben. Senden Sie die Mail ab — wir melden uns mit Terminvorschlag."}
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="mt-4 inline-flex min-h-10 items-center rounded-full border border-border px-4 text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-muted"
              >
                Weitere Anfrage
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <ol className="flex flex-wrap gap-1.5" aria-label="Schritte">
                {STEPS.map((s, index) => {
                  const active = index === stepIndex;
                  const done = index < stepIndex;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => goToStep(index)}
                        className={cn(
                          "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold tracking-[0.1em] uppercase transition-colors",
                          active
                            ? chipActive
                            : done
                              ? "border-foreground/40 bg-background text-foreground"
                              : chipIdle,
                        )}
                      >
                        <span className="tabular-nums opacity-70">
                          {index + 1}
                        </span>
                        {s.label}
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div
                className="mt-2 h-0.5 overflow-hidden bg-border"
                aria-hidden
              >
                <div
                  className="h-full bg-foreground transition-[width] duration-300"
                  style={{
                    width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-5 min-h-[14rem]">
                {step.id === "angebot" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-heading text-lg tracking-tight">
                        Angebot wählen
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Format, Dauer und Teilnehmerzahl — Preis live.
                      </p>
                    </div>

                    {formats.length > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Format</p>
                        <div
                          className="mt-1.5 flex flex-wrap gap-1.5"
                          role="group"
                          aria-label="Schulungsformat"
                        >
                          {formats.map((format) => {
                            const active = format.id === formatId;
                            return (
                              <button
                                key={format.id}
                                type="button"
                                onClick={() => setFormatId(format.id)}
                                aria-pressed={active}
                                className={cn(
                                  "min-h-9 rounded-full border px-3.5 text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors",
                                  active ? chipActive : chipIdle,
                                )}
                              >
                                {format.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {durations.length > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Dauer</p>
                        <div
                          className="mt-1.5 flex flex-wrap gap-1.5"
                          role="group"
                          aria-label="Schulungsdauer"
                        >
                          {durations.map((duration) => {
                            const active = duration.id === durationId;
                            return (
                              <button
                                key={duration.id}
                                type="button"
                                onClick={() => setDurationId(duration.id)}
                                aria-pressed={active}
                                className={cn(
                                  "min-h-9 rounded-full border px-3.5 text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors",
                                  active ? chipActive : chipIdle,
                                )}
                              >
                                {duration.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Teilnehmende
                        </p>
                        <p className="mt-0.5 font-heading text-2xl tracking-tight tabular-nums">
                          {participants}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setParticipants((n) => clamp(n - 1))
                          }
                          disabled={participants <= minParticipants}
                          className="inline-flex size-9 items-center justify-center rounded-full border border-border text-base transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Einen Teilnehmer weniger"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setParticipants((n) => clamp(n + 1))
                          }
                          disabled={participants >= maxParticipants}
                          className="inline-flex size-9 items-center justify-center rounded-full border border-border text-base transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Einen Teilnehmer mehr"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <label className="block">
                      <span className="sr-only">
                        Teilnehmerzahl von {minParticipants} bis{" "}
                        {maxParticipants}
                      </span>
                      <input
                        type="range"
                        min={minParticipants}
                        max={maxParticipants}
                        value={participants}
                        onChange={(e) =>
                          setParticipants(Number(e.target.value))
                        }
                        className="w-full accent-foreground"
                      />
                      <span className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                        <span>{minParticipants}</span>
                        <span>{maxParticipants}</span>
                      </span>
                    </label>

                    <div className="space-y-2 border-t border-border pt-3">
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {participants} × {formatEuro(pricePerParticipant)}{" "}
                          {netLabel}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            hasVolumeDiscount && "line-through opacity-55",
                          )}
                        >
                          {listNetFormatted}
                        </span>
                      </div>
                      {hasVolumeDiscount ? (
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {volumeDiscountLabel} (ab {volumeDiscountFrom} TN)
                          </span>
                          <span className="tabular-nums">
                            −{discountFormatted}
                          </span>
                        </div>
                      ) : volumeDiscountRate > 0 ? (
                        <p className="text-[11px] text-muted-foreground">
                          Ab {volumeDiscountFrom} Teilnehmern:{" "}
                          {discountPercentLabel} Mengenrabatt auf die
                          Netto-Summe.
                        </p>
                      ) : null}
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {vatLabel}
                        </span>
                        <span className="tabular-nums">{vatFormatted}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
                        <span className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
                          {totalLabel}
                        </span>
                        <p className="tabular-nums text-sm">{netFormatted}</p>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
                          {grossLabel}
                        </span>
                        <p className="font-heading text-[clamp(1.5rem,3.5vw,2rem)] leading-none tracking-[-0.03em] tabular-nums">
                          {grossFormatted}
                        </p>
                      </div>
                      {isOnSite && onSiteTravelNote ? (
                        <p className="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-foreground/85">
                          {onSiteTravelNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {step.id === "kontakt" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-heading text-lg tracking-tight">
                        Kontaktdaten
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Damit wir Ihnen Terminvorschläge zusenden können.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          Name *
                        </span>
                        <input
                          required
                          name="name"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          Kanzlei *
                        </span>
                        <input
                          required
                          name="firm"
                          autoComplete="organization"
                          value={firm}
                          onChange={(e) => setFirm(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          E-Mail *
                        </span>
                        <input
                          required
                          type="email"
                          name="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          Telefon
                        </span>
                        <input
                          type="tel"
                          name="phone"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Bevorzugter Kontakt
                        </p>
                        <div
                          className="mt-1.5 flex flex-wrap gap-1.5"
                          role="group"
                          aria-label="Kontaktwunsch"
                        >
                          {contactOptions.map((option) => {
                            const active = contactPreference === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setContactPreference(option)}
                                aria-pressed={active}
                                className={cn(
                                  "min-h-9 rounded-full border px-3.5 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors",
                                  active ? chipActive : chipIdle,
                                )}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step.id === "termin" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-heading text-lg tracking-tight">
                        Terminwunsch
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Wunsch- und Alternativtermin — optional, wir schlagen
                        passende Slots vor.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          1. Wunschtermin
                        </span>
                        <input
                          type="date"
                          name="preferredDate"
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          2. Alternativtermin
                        </span>
                        <input
                          type="date"
                          name="alternativeDate"
                          value={alternativeDate}
                          onChange={(e) => setAlternativeDate(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Tageszeit
                        </p>
                        <div
                          className="mt-1.5 flex flex-wrap gap-1.5"
                          role="group"
                          aria-label="Tageszeit"
                        >
                          {timeOptions.map((option) => {
                            const active = timePreference === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setTimePreference(option)}
                                aria-pressed={active}
                                className={cn(
                                  "min-h-9 rounded-full border px-3.5 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors",
                                  active ? chipActive : chipIdle,
                                )}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {isOnSite ? (
                        <label className="block sm:col-span-2">
                          <span className="text-xs text-muted-foreground">
                            Ort / Stadt der Kanzlei
                          </span>
                          <input
                            name="location"
                            placeholder="z. B. Bamberg, Nürnberg …"
                            autoComplete="address-level2"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className={fieldClass}
                          />
                        </label>
                      ) : null}
                      <label className="block sm:col-span-2">
                        <span className="text-xs text-muted-foreground">
                          Nachricht / besondere Wünsche
                        </span>
                        <textarea
                          name="message"
                          rows={2}
                          placeholder="z. B. Fokus Schriftsatz/Akte, bestehende Tools …"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className={cn(fieldClass, "min-h-[4rem] resize-y")}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                {step.id === "pruefen" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-heading text-lg tracking-tight">
                        Prüfen & senden
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Kurz kontrollieren — dann unverbindlich anfragen.
                      </p>
                    </div>
                    <div className="border border-border bg-background px-3 py-3">
                      <p className="text-[0.6rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                        Zusammenfassung
                      </p>
                      <ul className="mt-2 space-y-1 text-xs leading-snug text-foreground/90">
                        {summaryLines
                          .filter((line): line is string => Boolean(line))
                          .map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                      </ul>
                    </div>
                    <label className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
                      Website
                      <input
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </label>
                    {status.state === "error" ? (
                      <p
                        className="text-sm text-red-700 dark:text-red-400"
                        role="alert"
                      >
                        {status.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {stepError ? (
                <p
                  className="mt-3 text-sm text-red-700 dark:text-red-400"
                  role="alert"
                >
                  {stepError}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {!isFirst ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex min-h-10 items-center rounded-full border border-border px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-background"
                  >
                    Zurück
                  </button>
                ) : null}
                {!isLast ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-foreground px-6 text-xs font-semibold tracking-[0.12em] text-background uppercase transition-opacity hover:opacity-85 sm:flex-none"
                  >
                    Weiter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submitInquiry()}
                    disabled={status.state === "submitting"}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-foreground px-6 text-xs font-semibold tracking-[0.12em] text-background uppercase transition-opacity hover:opacity-85 disabled:opacity-50 sm:flex-none"
                  >
                    {status.state === "submitting"
                      ? "Wird gesendet…"
                      : primaryCta.label}
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-left">
                Schritt {stepIndex + 1} von {STEPS.length} · Unverbindlich ·
                Antwort in der Regel innerhalb eines Werktags
              </p>
            </div>
          )}
        </div>
      </div>
    </SectionFrame>
  );
}
