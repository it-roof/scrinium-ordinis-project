/** Sehr schlanke DE-IBAN-Hilfe: BLZ aus IBAN, BIC nur bei bekannten Instituten. */
const KNOWN_BANKS: Record<string, { name: string; bic: string }> = {
  "10010010": { name: "Postbank", bic: "PBNKDEFFXXX" },
  "10050000": { name: "Landesbank Berlin", bic: "BELADEBEXXX" },
  "20050550": { name: "Hamburger Sparkasse", bic: "HASPDEHHXXX" },
  "37040044": { name: "Commerzbank", bic: "COBADEFFXXX" },
  "50010517": { name: "ING-DiBa", bic: "INGDDEFFXXX" },
  "70020270": { name: "HypoVereinsbank", bic: "HYVEDEMMXXX" },
  "76026000": { name: "norisbank", bic: "NORSDE71XXX" },
};

export function enrichFromIban(ibanRaw: string): {
  bankName: string;
  bic: string;
} {
  const iban = ibanRaw.replace(/\s+/g, "").toUpperCase();
  if (!iban.startsWith("DE") || iban.length < 12) {
    return { bankName: "", bic: "" };
  }
  const blz = iban.slice(4, 12);
  const known = KNOWN_BANKS[blz];
  if (known) return { bankName: known.name, bic: known.bic };
  return { bankName: `Bank (BLZ ${blz})`, bic: "" };
}
