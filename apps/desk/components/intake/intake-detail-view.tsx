import Link from "next/link";

import type { IntakeInviteDetail } from "@/lib/intake/storage";
import { Button } from "@/components/desk/ui/button";

const STATUS_LABEL: Record<string, string> = {
  open: "Offen",
  submitted: "Ausgefüllt",
  revoked: "Widerrufen",
  expired: "Abgelaufen",
};

export function IntakeDetailView({ detail }: { detail: IntakeInviteDetail }) {
  const sub = detail.submission;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/aufnahmebogen">Zurück</Link>
        </Button>
        <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.1rem]">
          {detail.recipientName || detail.recipientEmail}
        </h1>
        <p className="text-sm text-muted-foreground">
          {detail.recipientEmail} · {STATUS_LABEL[detail.status] ?? detail.status}
        </p>
      </div>

      {!sub ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Antwort. Der Mandant hat den Link noch nicht abgeschickt.
        </p>
      ) : (
        <>
          {sub.missingItems.length > 0 ? (
            <section className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <h2 className="font-heading text-base font-medium">Fehlt noch</h2>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {sub.missingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keine offenen Hinweise — Angaben vollständig.
            </p>
          )}

          {sub.clientId ? (
            <p className="text-sm">
              Mandant angelegt/zugeordnet.{" "}
              <Link
                className="underline underline-offset-2"
                href={`/r/mandanten/${sub.clientId}`}
              >
                Zum Mandanten
              </Link>
            </p>
          ) : null}

          <PayloadSection title="Über Sie" rows={aboutRows(sub.payload)} />
          <PayloadSection title="Kontakt" rows={contactRows(sub.payload)} />
          <PayloadSection title="Ausweis" rows={idRows(sub.payload)} />
          {sub.partyKind === "company" ? (
            <section className="space-y-2">
              <h2 className="font-heading text-base font-medium">
                Wirtschaftlich Berechtigte
              </h2>
              <ul className="space-y-2 text-sm">
                {sub.payload.beneficialOwners.map((o, i) => (
                  <li key={i} className="rounded-lg border border-border/50 p-3">
                    {o.name} · {o.participationType} · {o.sharePercent}% · seit{" "}
                    {o.validFrom || "—"}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <PayloadSection title="Anliegen" rows={matterRows(sub.payload)} />
          <PayloadSection
            title="Bank & Versicherung"
            rows={bankRows(sub.payload)}
          />

          {sub.signaturePng ? (
            <section className="space-y-2">
              <h2 className="font-heading text-base font-medium">Unterschrift</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sub.signaturePng}
                alt="Unterschrift"
                className="max-h-40 rounded-lg border border-border/50 bg-white"
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function PayloadSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-base font-medium">{title}</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg bg-muted/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{row.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function aboutRows(p: NonNullable<IntakeInviteDetail["submission"]>["payload"]) {
  return [
    { label: "Art", value: p.partyKind === "company" ? "Unternehmen" : "Privatperson" },
    ...(p.partyKind === "company"
      ? [{ label: "Firma", value: p.companyName }]
      : []),
    { label: "Vorname", value: p.firstName },
    { label: "Nachname", value: p.lastName },
    { label: "Geburtsdatum", value: p.birthDate },
    { label: "Geburtsort", value: p.birthPlace },
    { label: "Staatsangehörigkeit", value: p.nationality },
  ];
}

function contactRows(p: NonNullable<IntakeInviteDetail["submission"]>["payload"]) {
  return [
    { label: "Straße", value: p.street },
    { label: "PLZ / Ort", value: `${p.postalCode} ${p.city}`.trim() },
    { label: "Mobil", value: p.mobile },
    { label: "Festnetz", value: p.phone },
    { label: "Fax", value: p.fax },
    { label: "E-Mail", value: p.email },
    {
      label: "Korrespondenz per E-Mail",
      value: p.emailCorrespondence ? "Ja" : "Nein",
    },
  ];
}

function idRows(p: NonNullable<IntakeInviteDetail["submission"]>["payload"]) {
  if (p.idSkipped) {
    return [{ label: "Status", value: "Beim Termin vorzeigen" }];
  }
  return [
    { label: "Art", value: p.idType },
    { label: "Nummer", value: p.idNumber },
    { label: "Ausgestellt am", value: p.idIssuedAt },
    { label: "Gültig bis", value: p.idValidUntil },
    { label: "Behörde", value: p.idAuthority },
  ];
}

function matterRows(p: NonNullable<IntakeInviteDetail["submission"]>["payload"]) {
  return [
    { label: "Sachverhalt", value: p.matterSummary },
    {
      label: "Gegner",
      value:
        p.opponentChip === "yes"
          ? `${p.opponentName}\n${p.opponentContact}`
          : p.opponentChip === "no"
            ? "Nein"
            : "Weiß nicht",
    },
  ];
}

function bankRows(p: NonNullable<IntakeInviteDetail["submission"]>["payload"]) {
  return [
    { label: "Kontoinhaber", value: p.accountHolder },
    { label: "IBAN", value: p.iban },
    { label: "Bank", value: p.bankName },
    { label: "BIC", value: p.bic },
    {
      label: "Rechtsschutz",
      value:
        p.legalInsuranceChip === "yes"
          ? `${p.insuranceNumber} / SB ${p.deductible} / ${p.insuranceContact}`
          : p.legalInsuranceChip === "no"
            ? "Nein"
            : "Weiß nicht",
    },
    { label: "Empfehlung durch", value: p.referral },
  ];
}
