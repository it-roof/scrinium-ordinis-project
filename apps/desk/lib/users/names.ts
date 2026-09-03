/** Anzeigename aus Vor- und Nachname. */
export function formatUserName(user: {
  firstName: string;
  lastName: string;
}): string {
  return [user.firstName, user.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

export const USER_SALUTATION_LABELS = {
  herr: "Herr",
  frau: "Frau",
} as const;

export function isUserSalutation(
  value: string
): value is keyof typeof USER_SALUTATION_LABELS {
  return value === "herr" || value === "frau";
}

/** Begrüßung z. B. „Guten Tag Herr Schneiderbanger“. */
export function formatDeskGreeting(input: {
  salutation: keyof typeof USER_SALUTATION_LABELS | null | undefined;
  lastName: string;
}): string {
  const lastName = input.lastName.trim();
  const salutationLabel = input.salutation
    ? USER_SALUTATION_LABELS[input.salutation]
    : null;

  if (salutationLabel && lastName) {
    return `Guten Tag ${salutationLabel} ${lastName},`;
  }
  if (lastName) {
    return `Guten Tag ${lastName},`;
  }
  if (salutationLabel) {
    return `Guten Tag ${salutationLabel},`;
  }
  return "Guten Tag,";
}

/** Listenformat: Nachname, Vorname */
export function formatUserListName(user: {
  firstName: string;
  lastName: string;
  name?: string;
}): string {
  const lastName = user.lastName.trim();
  const firstName = user.firstName.trim();
  if (lastName && firstName) {
    return `${lastName}, ${firstName}`;
  }
  if (lastName) {
    return lastName;
  }
  if (firstName) {
    return firstName;
  }
  return user.name?.trim() || "";
}

/** Persistierter Display-Name (`users.name`) aus Vor-/Nachname. */
export function resolveUserDisplayName(input: {
  firstName: string;
  lastName: string;
}): string {
  return formatUserName(input);
}

export function letterForLastName(lastName: string): string {
  const trimmed = lastName.trim();
  if (!trimmed) {
    return "#";
  }
  const letter = trimmed.charAt(0).toLocaleUpperCase("de-DE");
  return /[A-ZÄÖÜ]/.test(letter) ? letter : "#";
}

export function compareUsersByLastName(
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string }
): number {
  const byLast = a.lastName.localeCompare(b.lastName, "de", {
    sensitivity: "base",
  });
  if (byLast !== 0) {
    return byLast;
  }
  return a.firstName.localeCompare(b.firstName, "de", { sensitivity: "base" });
}
