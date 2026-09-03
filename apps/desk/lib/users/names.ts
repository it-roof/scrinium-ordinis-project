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
