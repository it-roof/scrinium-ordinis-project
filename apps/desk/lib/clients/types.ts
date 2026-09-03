import type { ContentModule } from "@/lib/db/schema";

export const CLIENT_KINDS = [
  { value: "company", label: "Firma" },
  { value: "person", label: "Privatperson" },
] as const;

export type ClientKind = (typeof CLIENT_KINDS)[number]["value"];

/** Mandant (Firma oder Privatperson). */
export type ClientRecord = {
  id: string;
  kind: ClientKind;
  name: string;
  salutation: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  module: ContentModule;
  matterCount: number;
  personCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = {
  kind: ClientKind;
  name: string;
  salutation: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  module: ContentModule;
};

/** Kontaktperson einer Firma (nur bei kind=company). */
export type ClientPersonRecord = {
  id: string;
  clientId: string;
  salutation: string;
  firstName: string;
  lastName: string;
  role: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientPersonInput = {
  clientId: string;
  salutation: string;
  firstName: string;
  lastName: string;
  role: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
};

/** Standard-Anreden. */
export const PERSON_SALUTATIONS = ["Herr", "Frau"] as const;

export function formatPersonName(
  person: Pick<
    ClientPersonRecord,
    "salutation" | "firstName" | "lastName"
  >
): string {
  return [person.salutation, person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

export function formatPersonShortName(
  person: Pick<ClientPersonRecord, "firstName" | "lastName">
): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

/** Listenformat: Nachname, Vorname */
export function formatPersonListName(
  person: Pick<ClientPersonRecord, "firstName" | "lastName">
): string {
  const lastName = person.lastName.trim();
  const firstName = person.firstName.trim();
  if (lastName && firstName) {
    return `${lastName}, ${firstName}`;
  }
  if (lastName) {
    return lastName;
  }
  if (firstName) {
    return firstName;
  }
  return "";
}

/** Anzeigename eines Mandanten. */
export function formatClientName(client: ClientRecord): string {
  if (client.kind === "person") {
    return (
      formatPersonListName({
        firstName: client.firstName,
        lastName: client.lastName,
      }) || client.name
    );
  }
  return client.name;
}

export function clientKindLabel(kind: ClientKind): string {
  return CLIENT_KINDS.find((entry) => entry.value === kind)?.label ?? kind;
}

/** Display-Name für Persistenz (Liste/Suche). */
export function resolveClientDisplayName(input: {
  kind: ClientKind;
  name: string;
  firstName: string;
  lastName: string;
}): string {
  if (input.kind === "person") {
    return formatPersonListName({
      firstName: input.firstName,
      lastName: input.lastName,
    });
  }
  return input.name.trim();
}

export type MatterRecord = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  reference: string;
  notes: string;
  module: ContentModule;
  letterCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MatterInput = {
  clientId: string;
  title: string;
  reference: string;
  notes: string;
  module: ContentModule;
};

/** Mandant mit E-Mail für Empfänger-Auswahl im E-Mail-Editor. */
export type ClientRecipientOption = {
  clientId: string;
  clientName: string;
  clientKind: ClientKind;
  email: string;
  contact?: {
    id: string;
    name: string;
    role: string;
  };
  matters: Array<{ id: string; title: string; reference: string }>;
};

/** Treffer bei Abgleich einer Empfänger-E-Mail mit Mandanten/Kontakten. */
export type ClientEmailMatch = {
  clientId: string;
  clientName: string;
  clientKind: ClientKind;
  matchedEmail: string;
  matchVia: "client" | "contact";
  contact?: {
    id: string;
    name: string;
    role: string;
  };
  matters: Array<{ id: string; title: string; reference: string }>;
};

/** @deprecated Import from @/lib/letters/types */
export type { InboxItem } from "@/lib/letters/types";
