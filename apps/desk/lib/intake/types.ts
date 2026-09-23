/** Payload des öffentlichen Mandats-Aufnahmebogens. */
export type IntakePartyKind = "person" | "company";

export type IntakeChipAnswer = "yes" | "no" | "unknown";

export type IntakeBeneficialOwner = {
  name: string;
  participationType: string;
  sharePercent: string;
  validFrom: string;
};

export type IntakePayload = {
  partyKind: IntakePartyKind;
  // Über Sie
  firstName: string;
  lastName: string;
  companyName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  // Kontakt
  street: string;
  postalCode: string;
  city: string;
  mobile: string;
  phone: string;
  fax: string;
  showFax: boolean;
  email: string;
  emailCorrespondence: boolean;
  // Ausweis
  idSkipped: boolean;
  idType: string;
  idNumber: string;
  idIssuedAt: string;
  idValidUntil: string;
  idAuthority: string;
  // Wirtschaftlich Berechtigte
  beneficialOwners: IntakeBeneficialOwner[];
  // Anliegen
  matterSummary: string;
  opponentChip: IntakeChipAnswer;
  opponentName: string;
  opponentContact: string;
  // Bank & Versicherung
  accountHolder: string;
  iban: string;
  bankName: string;
  bic: string;
  legalInsuranceChip: IntakeChipAnswer;
  insuranceNumber: string;
  deductible: string;
  insuranceContact: string;
  referral: string;
};

export type IntakeConsents = {
  feeUnderstood: boolean;
  privacyReceived: boolean;
  dataProcessing: boolean;
  signedAt: string;
};

export const EMPTY_INTAKE_PAYLOAD: IntakePayload = {
  partyKind: "person",
  firstName: "",
  lastName: "",
  companyName: "",
  birthDate: "",
  birthPlace: "",
  nationality: "deutsch",
  street: "",
  postalCode: "",
  city: "",
  mobile: "",
  phone: "",
  fax: "",
  showFax: false,
  email: "",
  emailCorrespondence: true,
  idSkipped: false,
  idType: "Personalausweis",
  idNumber: "",
  idIssuedAt: "",
  idValidUntil: "",
  idAuthority: "",
  beneficialOwners: [],
  matterSummary: "",
  opponentChip: "unknown",
  opponentName: "",
  opponentContact: "",
  accountHolder: "",
  iban: "",
  bankName: "",
  bic: "",
  legalInsuranceChip: "unknown",
  insuranceNumber: "",
  deductible: "",
  insuranceContact: "",
  referral: "",
};

export function computeMissingItems(payload: IntakePayload): string[] {
  const missing: string[] = [];
  if (payload.idSkipped) {
    missing.push("Ausweis: bringen Sie beim Termin mit");
  } else {
    if (!payload.idType.trim()) missing.push("Ausweisart fehlt");
    if (!payload.idNumber.trim()) missing.push("Ausweisnummer fehlt");
  }
  if (payload.opponentChip === "yes") {
    if (!payload.opponentName.trim()) {
      missing.push("Gegner: Name fehlt");
    }
  }
  if (payload.legalInsuranceChip === "yes") {
    if (!payload.insuranceNumber.trim()) {
      missing.push("Rechtsschutz: Versicherungsnummer fehlt");
    }
  }
  if (!payload.iban.trim()) {
    missing.push("Bankverbindung: IBAN fehlt (optional)");
  }
  if (!payload.phone.trim() && !payload.mobile.trim()) {
    missing.push("Telefonnummer fehlt");
  }
  return missing;
}
