"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { SignaturePad } from "@/components/intake/signature-pad";
import { submitPublicIntakeAction } from "@/lib/intake/actions";
import { enrichFromIban } from "@/lib/intake/iban";
import {
  computeMissingItems,
  EMPTY_INTAKE_PAYLOAD,
  type IntakeChipAnswer,
  type IntakePayload,
} from "@/lib/intake/types";
import { Input } from "@/components/desk/ui/input";
import { Label } from "@/components/desk/ui/label";
import { Textarea } from "@/components/desk/ui/textarea";

type StepId =
  | "start"
  | "about"
  | "contact"
  | "id"
  | "beneficial"
  | "matter"
  | "bank"
  | "finish";

const FIELD_SELECTOR =
  'input:not([type="hidden"]):not([type="checkbox"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

function visibleFields(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(
    (el) => {
      if (el.getAttribute("aria-hidden") === "true") return false;
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    }
  );
}

export function PublicIntakeForm({
  token,
  tenantName,
  recipientEmail,
  recipientName,
}: {
  token: string;
  tenantName: string;
  recipientEmail: string;
  recipientName: string;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const [payload, setPayload] = useState<IntakePayload>(() => ({
    ...EMPTY_INTAKE_PAYLOAD,
    email: recipientEmail,
    firstName: recipientName.split(/\s+/)[0] ?? "",
    lastName: recipientName.split(/\s+/).slice(1).join(" "),
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [signaturePng, setSignaturePng] = useState("");
  const [feeUnderstood, setFeeUnderstood] = useState(false);
  const [privacyReceived, setPrivacyReceived] = useState(false);
  const [dataProcessing, setDataProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const steps = useMemo((): StepId[] => {
    const base: StepId[] = ["start", "about", "contact", "id"];
    if (payload.partyKind === "company") base.push("beneficial");
    base.push("matter", "bank", "finish");
    return base;
  }, [payload.partyKind]);

  const step = steps[Math.min(stepIndex, steps.length - 1)]!;
  const progressLabel = `${Math.min(stepIndex + 1, steps.length)} / ${steps.length}`;

  function patch(partial: Partial<IntakePayload>) {
    setPayload((prev) => ({ ...prev, ...partial }));
  }

  function canContinue(): boolean {
    switch (step) {
      case "start":
        return true;
      case "about":
        if (payload.partyKind === "company" && !payload.companyName.trim()) {
          return false;
        }
        return Boolean(
          payload.firstName.trim() &&
            payload.lastName.trim() &&
            payload.birthDate.trim() &&
            payload.birthPlace.trim() &&
            payload.nationality.trim()
        );
      case "contact":
        return Boolean(
          payload.street.trim() &&
            payload.postalCode.trim() &&
            payload.city.trim() &&
            payload.mobile.trim() &&
            payload.email.trim()
        );
      case "id":
        if (payload.idSkipped) return true;
        return Boolean(
          payload.idType.trim() &&
            payload.idNumber.trim() &&
            payload.idIssuedAt.trim() &&
            payload.idValidUntil.trim() &&
            payload.idAuthority.trim()
        );
      case "beneficial":
        return (
          payload.beneficialOwners.length > 0 &&
          payload.beneficialOwners.every(
            (o) =>
              o.name.trim() &&
              o.participationType.trim() &&
              o.sharePercent.trim()
          )
        );
      case "matter":
        if (!payload.matterSummary.trim()) return false;
        if (payload.opponentChip === "yes" && !payload.opponentName.trim()) {
          return false;
        }
        return true;
      case "bank":
        if (
          payload.legalInsuranceChip === "yes" &&
          !payload.insuranceNumber.trim()
        ) {
          return false;
        }
        return true;
      case "finish":
        return (
          feeUnderstood &&
          privacyReceived &&
          dataProcessing &&
          Boolean(signaturePng)
        );
      default:
        return false;
    }
  }

  function goNext() {
    if (step === "start" && payload.partyKind === "company") {
      const contactName =
        `${payload.firstName} ${payload.lastName}`.trim() ||
        recipientName ||
        "";
      if (payload.beneficialOwners.length === 0) {
        patch({
          beneficialOwners: [
            {
              name: contactName,
              participationType: "Gesellschafter",
              sharePercent: "",
              validFrom: "",
            },
          ],
        });
      }
    }
    if (step === "about") {
      const holder =
        payload.partyKind === "company"
          ? payload.companyName
          : `${payload.firstName} ${payload.lastName}`.trim();
      if (!payload.accountHolder) {
        patch({ accountHolder: holder });
      }
    }
    if (step === "finish") {
      submit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function tryGoNext() {
    if (!canContinue() || pending) return;
    goNext();
  }

  function submit() {
    startTransition(async () => {
      const result = await submitPublicIntakeAction({
        token,
        payload,
        consents: {
          feeUnderstood,
          privacyReceived,
          dataProcessing,
          signedAt: "",
        },
        signaturePng,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone(true);
    });
  }

  useEffect(() => {
    const root = formRef.current;
    if (!root) return;
    const choice = root.querySelector<HTMLElement>(
      "button.lab-intake-choice[data-active='true'], button.lab-intake-choice"
    );
    const fields = visibleFields(root);
    const focusTarget = fields[0] ?? choice;
    focusTarget?.focus();
  }, [step]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || pending) return;

    const target = e.target as HTMLElement;
    const root = formRef.current;
    if (!root) return;

    if (target.tagName === "TEXTAREA") {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      tryGoNext();
      return;
    }

    if (target.closest("a")) return;

    const primary = target.closest("button.b-btn-primary");
    if (primary) {
      e.preventDefault();
      tryGoNext();
      return;
    }

    if (target.closest("button.b-btn-ghost")) return;

    if (
      target.matches("button.lab-intake-choice, button.lab-intake-chip") ||
      target.closest("button.lab-intake-choice, button.lab-intake-chip")
    ) {
      const btn = target.closest("button");
      if (!btn || btn.getAttribute("data-active") !== "true") {
        // Erster Enter: Auswahl übernehmen (native click)
        return;
      }
      e.preventDefault();
      tryGoNext();
      return;
    }

    if (target.tagName !== "INPUT" && target.tagName !== "SELECT") return;
    if ((target as HTMLInputElement).type === "checkbox") return;

    e.preventDefault();
    const fields = visibleFields(root);
    const idx = fields.indexOf(target);
    if (idx >= 0 && idx < fields.length - 1) {
      fields[idx + 1]?.focus();
      return;
    }
    tryGoNext();
  }

  if (done) {
    return (
      <div className="lab-intake flex flex-col justify-center text-center">
        <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
          {tenantName}
        </p>
        <h1 className="b-display b-title mt-3 font-medium tracking-[-0.02em]">
          Vielen Dank
        </h1>
        <p className="b-lead mx-auto mt-2">
          Ihr Aufnahmebogen ist bei uns angekommen. Wir melden uns bei Ihnen.
        </p>
      </div>
    );
  }

  const missingPreview = computeMissingItems(payload);

  return (
    <div
      ref={formRef}
      className="lab-intake flex w-full flex-col"
      onKeyDown={handleKeyDown}
    >
      <header className="mb-6 flex flex-col md:mb-8">
        <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
          {tenantName}
        </p>
        <h1 className="b-display b-title mt-2 font-medium tracking-[-0.02em] md:mt-3.5">
          Aufnahmebogen
        </h1>
        <div className="mt-5 flex items-center gap-3">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--b-soft)" }}
            aria-hidden
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${((stepIndex + 1) / steps.length) * 100}%`,
                background: "var(--b-ink)",
              }}
            />
          </div>
          <p className="b-meta shrink-0 tabular-nums">{progressLabel}</p>
        </div>
      </header>

      <div className="flex-1 space-y-5 pb-4">
        {step === "start" ? (
          <StartStep
            value={payload.partyKind}
            onChange={(partyKind) => patch({ partyKind })}
          />
        ) : null}
        {step === "about" ? (
          <AboutStep payload={payload} patch={patch} />
        ) : null}
        {step === "contact" ? (
          <ContactStep payload={payload} patch={patch} />
        ) : null}
        {step === "id" ? <IdStep payload={payload} patch={patch} /> : null}
        {step === "beneficial" ? (
          <BeneficialStep payload={payload} patch={patch} />
        ) : null}
        {step === "matter" ? (
          <MatterStep payload={payload} patch={patch} />
        ) : null}
        {step === "bank" ? <BankStep payload={payload} patch={patch} /> : null}
        {step === "finish" ? (
          <FinishStep
            payload={payload}
            missingPreview={missingPreview}
            feeUnderstood={feeUnderstood}
            privacyReceived={privacyReceived}
            dataProcessing={dataProcessing}
            signaturePng={signaturePng}
            onFee={setFeeUnderstood}
            onPrivacy={setPrivacyReceived}
            onData={setDataProcessing}
            onSignature={setSignaturePng}
          />
        ) : null}
      </div>

      <div className="lab-intake-nav">
        <button
          type="button"
          className="b-btn b-btn-ghost disabled:opacity-40"
          disabled={stepIndex === 0 || pending}
          onClick={goBack}
        >
          Zurück
        </button>
        <button
          type="button"
          className="b-btn b-btn-primary disabled:opacity-40"
          disabled={!canContinue() || pending}
          onClick={goNext}
        >
          {step === "finish" ? (pending ? "Senden…" : "Absenden") : "Weiter"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[0.8125rem] font-medium" style={{ color: "var(--b-ink)" }}>
        {label}
      </Label>
      {hint ? <p className="b-meta text-[0.75rem]">{hint}</p> : null}
      {children}
    </div>
  );
}

function ChipRow({
  value,
  onChange,
}: {
  value: IntakeChipAnswer;
  onChange: (v: IntakeChipAnswer) => void;
}) {
  const opts: Array<{ id: IntakeChipAnswer; label: string }> = [
    { id: "yes", label: "Ja" },
    { id: "no", label: "Nein" },
    { id: "unknown", label: "Weiß nicht" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className="lab-intake-chip text-[0.875rem] font-medium"
          data-active={value === opt.id ? "true" : "false"}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StartStep({
  value,
  onChange,
}: {
  value: IntakePayload["partyKind"];
  onChange: (v: IntakePayload["partyKind"]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
        Für wen ist das Mandat?
      </p>
      <div className="lab-intake-grid-2">
        {(
          [
            { id: "person" as const, label: "Privatperson" },
            { id: "company" as const, label: "Unternehmen" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="lab-intake-choice b-display p-4 text-left text-[1.0625rem] font-medium tracking-[-0.01em] sm:p-5"
            data-active={value === opt.id ? "true" : "false"}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AboutStep({
  payload,
  patch,
}: {
  payload: IntakePayload;
  patch: (p: Partial<IntakePayload>) => void;
}) {
  return (
    <div className="space-y-4">
      {payload.partyKind === "company" ? (
        <Field label="Firmenname">
          <Input
            value={payload.companyName}
            onChange={(e) => patch({ companyName: e.target.value })}
          />
        </Field>
      ) : null}
      <div className="lab-intake-grid-2">
        <Field label="Vorname">
          <Input
            value={payload.firstName}
            onChange={(e) => patch({ firstName: e.target.value })}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Nachname">
          <Input
            value={payload.lastName}
            onChange={(e) => patch({ lastName: e.target.value })}
            autoComplete="family-name"
          />
        </Field>
      </div>
      <Field label="Geburtsdatum">
        <Input
          type="date"
          value={payload.birthDate}
          onChange={(e) => patch({ birthDate: e.target.value })}
          autoComplete="bday"
        />
      </Field>
      <Field label="Wo sind Sie geboren?" hint="Stadt, ggf. Land">
        <Input
          value={payload.birthPlace}
          onChange={(e) => patch({ birthPlace: e.target.value })}
        />
      </Field>
      <Field label="Staatsangehörigkeit">
        <Input
          value={payload.nationality}
          onChange={(e) => patch({ nationality: e.target.value })}
        />
      </Field>
    </div>
  );
}

function ContactStep({
  payload,
  patch,
}: {
  payload: IntakePayload;
  patch: (p: Partial<IntakePayload>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Straße und Hausnummer">
        <Input
          value={payload.street}
          onChange={(e) => patch({ street: e.target.value })}
          autoComplete="street-address"
        />
      </Field>
      <div className="lab-intake-grid-postal">
        <Field label="PLZ">
          <Input
            value={payload.postalCode}
            onChange={(e) => patch({ postalCode: e.target.value })}
            autoComplete="postal-code"
            inputMode="numeric"
          />
        </Field>
        <Field label="Ort">
          <Input
            value={payload.city}
            onChange={(e) => patch({ city: e.target.value })}
            autoComplete="address-level2"
          />
        </Field>
      </div>
      <Field label="Handynummer">
        <Input
          type="tel"
          value={payload.mobile}
          onChange={(e) => patch({ mobile: e.target.value })}
          autoComplete="tel"
          inputMode="tel"
        />
      </Field>
      <Field label="Festnetznummer (optional)">
        <Input
          type="tel"
          value={payload.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          autoComplete="tel"
          inputMode="tel"
        />
      </Field>
      {!payload.showFax ? (
        <button
          type="button"
          className="b-meta text-[0.8125rem] underline underline-offset-2"
          onClick={() => patch({ showFax: true })}
        >
          + Fax
        </button>
      ) : (
        <Field label="Faxnummer (optional)">
          <Input
            value={payload.fax}
            onChange={(e) => patch({ fax: e.target.value })}
          />
        </Field>
      )}
      <Field label="E-Mail">
        <Input
          type="email"
          value={payload.email}
          onChange={(e) => patch({ email: e.target.value })}
          autoComplete="email"
          inputMode="email"
        />
      </Field>
      <label className="flex items-start gap-2.5 text-[0.875rem] leading-relaxed">
        <input
          type="checkbox"
          className="mt-1"
          checked={payload.emailCorrespondence}
          onChange={(e) => patch({ emailCorrespondence: e.target.checked })}
        />
        <span>Wir dürfen Ihnen per E-Mail schreiben</span>
      </label>
    </div>
  );
}

function IdStep({
  payload,
  patch,
}: {
  payload: IntakePayload;
  patch: (p: Partial<IntakePayload>) => void;
}) {
  if (payload.idSkipped) {
    return (
      <div className="space-y-4">
        <p className="b-lead max-w-none">
          Ausweis später beim Termin vorzeigen.
        </p>
        <button
          type="button"
          className="b-meta text-[0.8125rem] underline underline-offset-2"
          onClick={() => patch({ idSkipped: false })}
        >
          Ausweis doch angeben
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Womit weisen Sie sich aus?">
        <Input
          value={payload.idType}
          onChange={(e) => patch({ idType: e.target.value })}
        />
      </Field>
      <Field
        label="Ausweisnummer"
        hint="Steht oben rechts auf der Vorderseite"
      >
        <Input
          value={payload.idNumber}
          onChange={(e) => patch({ idNumber: e.target.value })}
        />
      </Field>
      <div className="lab-intake-grid-2">
        <Field label="Ausgestellt am" hint="Rückseite des Personalausweises">
          <Input
            type="date"
            value={payload.idIssuedAt}
            onChange={(e) => patch({ idIssuedAt: e.target.value })}
          />
        </Field>
        <Field label="Gültig bis" hint="Vorderseite">
          <Input
            type="date"
            value={payload.idValidUntil}
            onChange={(e) => patch({ idValidUntil: e.target.value })}
          />
        </Field>
      </div>
      <Field
        label="Ausgestellt von"
        hint='Rückseite, z. B. „Stadt Bayreuth"'
      >
        <Input
          value={payload.idAuthority}
          onChange={(e) => patch({ idAuthority: e.target.value })}
        />
      </Field>
      <button
        type="button"
        className="b-meta text-[0.8125rem] underline underline-offset-2"
        onClick={() => patch({ idSkipped: true })}
      >
        Ausweis nicht zur Hand? Beim Termin vorzeigen.
      </button>
    </div>
  );
}

function BeneficialStep({
  payload,
  patch,
}: {
  payload: IntakePayload;
  patch: (p: Partial<IntakePayload>) => void;
}) {
  const owners = payload.beneficialOwners;

  function update(i: number, partial: Partial<(typeof owners)[0]>) {
    const next = owners.map((o, idx) => (idx === i ? { ...o, ...partial } : o));
    patch({ beneficialOwners: next });
  }

  return (
    <div className="space-y-4">
      <p className="b-meta">
        Personen mit mehr als 25&nbsp;% Anteilen oder Stimmrechten
        (Geldwäschegesetz).
      </p>
      {owners.map((o, i) => (
        <div key={i} className="lab-intake-panel space-y-3 p-4">
          <Field label="Name der Person">
            <Input
              value={o.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </Field>
          <Field
            label="Wie ist die Person beteiligt?"
            hint="z. B. Gesellschafter, Aktionär, Treugeber"
          >
            <Input
              value={o.participationType}
              onChange={(e) =>
                update(i, { participationType: e.target.value })
              }
            />
          </Field>
          <div className="lab-intake-grid-2">
            <Field label="Anteil am Unternehmen in %">
              <Input
                value={o.sharePercent}
                onChange={(e) => update(i, { sharePercent: e.target.value })}
                inputMode="decimal"
              />
            </Field>
            <Field label="Beteiligt seit (optional)">
              <Input
                type="date"
                value={o.validFrom}
                onChange={(e) => update(i, { validFrom: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="b-btn b-btn-ghost"
        onClick={() =>
          patch({
            beneficialOwners: [
              ...owners,
              {
                name: "",
                participationType: "",
                sharePercent: "",
                validFrom: "",
              },
            ],
          })
        }
      >
        Weitere Person hinzufügen
      </button>
    </div>
  );
}

function MatterStep({
  payload,
  patch,
}: {
  payload: IntakePayload;
  patch: (p: Partial<IntakePayload>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Worum geht es?"
        hint="Ein paar Stichworte reichen, Details besprechen wir persönlich."
      >
        <Textarea
          value={payload.matterSummary}
          onChange={(e) => patch({ matterSummary: e.target.value })}
          rows={4}
        />
      </Field>
      <div className="space-y-2">
        <Label
          className="text-[0.8125rem] font-medium"
          style={{ color: "var(--b-ink)" }}
        >
          Gibt es eine Gegenseite?
        </Label>
        <ChipRow
          value={payload.opponentChip}
          onChange={(opponentChip) => patch({ opponentChip })}
        />
      </div>
      {payload.opponentChip === "yes" ? (
        <>
          <Field label="Gegen wen richtet sich Ihr Anliegen?">
            <Input
              value={payload.opponentName}
              onChange={(e) => patch({ opponentName: e.target.value })}
            />
          </Field>
          <Field label="Adresse / Telefon (falls bekannt) (optional)">
            <Input
              value={payload.opponentContact}
              onChange={(e) => patch({ opponentContact: e.target.value })}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}

function BankStep({
  payload,
  patch,
}: {
  payload: IntakePayload;
  patch: (p: Partial<IntakePayload>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="b-meta">Optional — nur falls wir Ihnen Geld überweisen.</p>
      <Field label="Kontoinhaber">
        <Input
          value={payload.accountHolder}
          onChange={(e) => patch({ accountHolder: e.target.value })}
        />
      </Field>
      <Field label="IBAN (optional)" hint="Steht auf Ihrer Bankkarte oder im Online-Banking">
        <Input
          value={payload.iban}
          onChange={(e) => {
            const iban = e.target.value;
            const enriched = enrichFromIban(iban);
            patch({
              iban,
              bankName: enriched.bankName || payload.bankName,
              bic: enriched.bic || payload.bic,
            });
          }}
        />
      </Field>
      {payload.bankName ? (
        <p className="b-meta text-[0.75rem]">
          {payload.bankName}
          {payload.bic ? ` · BIC ${payload.bic}` : ""}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label
          className="text-[0.8125rem] font-medium"
          style={{ color: "var(--b-ink)" }}
        >
          Haben Sie eine Rechtsschutzversicherung?
        </Label>
        <ChipRow
          value={payload.legalInsuranceChip}
          onChange={(legalInsuranceChip) => patch({ legalInsuranceChip })}
        />
      </div>
      {payload.legalInsuranceChip === "yes" ? (
        <>
          <Field label="Versicherungsnummer">
            <Input
              value={payload.insuranceNumber}
              onChange={(e) => patch({ insuranceNumber: e.target.value })}
            />
          </Field>
          <Field label="Selbstbeteiligung in € (optional)">
            <Input
              value={payload.deductible}
              onChange={(e) => patch({ deductible: e.target.value })}
            />
          </Field>
          <Field label="Ansprechpartner bei der Versicherung (optional)">
            <Input
              value={payload.insuranceContact}
              onChange={(e) => patch({ insuranceContact: e.target.value })}
            />
          </Field>
        </>
      ) : null}
      <Field label="Wie haben Sie uns gefunden? (optional)">
        <Input
          value={payload.referral}
          onChange={(e) => patch({ referral: e.target.value })}
        />
      </Field>
    </div>
  );
}

function FinishStep({
  payload,
  missingPreview,
  feeUnderstood,
  privacyReceived,
  dataProcessing,
  signaturePng,
  onFee,
  onPrivacy,
  onData,
  onSignature,
}: {
  payload: IntakePayload;
  missingPreview: string[];
  feeUnderstood: boolean;
  privacyReceived: boolean;
  dataProcessing: boolean;
  signaturePng: string;
  onFee: (v: boolean) => void;
  onPrivacy: (v: boolean) => void;
  onData: (v: boolean) => void;
  onSignature: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="b-meta">Angaben prüfen</p>
        <p className="b-display text-[1.0625rem] font-medium tracking-[-0.01em]">
          {payload.partyKind === "company"
            ? payload.companyName
            : `${payload.firstName} ${payload.lastName}`}
        </p>
        <p className="b-meta">{payload.email}</p>
        {payload.matterSummary ? (
          <p className="b-meta mt-2">{payload.matterSummary}</p>
        ) : null}
        {missingPreview.length > 0 ? (
          <p className="b-meta mt-3">
            Noch offen: {missingPreview.join(" · ")}
          </p>
        ) : null}
      </section>

      <label className="flex items-start gap-2.5 text-[0.875rem] leading-relaxed">
        <input
          type="checkbox"
          className="mt-1"
          checked={feeUnderstood}
          onChange={(e) => onFee(e.target.checked)}
        />
        <span>
          Die Gebühren richten sich nach dem Wert der Angelegenheit. Verstanden
          (§&nbsp;49b BRAO).
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-[0.875rem] leading-relaxed">
        <input
          type="checkbox"
          className="mt-1"
          checked={privacyReceived}
          onChange={(e) => onPrivacy(e.target.checked)}
        />
        <span>
          Ich habe die{" "}
          <a
            href="/datenschutz-erstinformation"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
            style={{ color: "var(--b-ink)" }}
          >
            Datenschutzhinweise
          </a>{" "}
          erhalten.
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-[0.875rem] leading-relaxed">
        <input
          type="checkbox"
          className="mt-1"
          checked={dataProcessing}
          onChange={(e) => onData(e.target.checked)}
        />
        <span>
          Einverstanden mit der Verarbeitung meiner Daten für dieses Mandat.
        </span>
      </label>

      <div className="space-y-2">
        <Label
          className="text-[0.8125rem] font-medium"
          style={{ color: "var(--b-ink)" }}
        >
          Unterschrift
        </Label>
        <SignaturePad value={signaturePng} onChange={onSignature} />
      </div>
    </div>
  );
}
