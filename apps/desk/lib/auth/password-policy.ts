export const PASSWORD_MIN_LENGTH = 12;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`;
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Passwort muss Buchstaben und Ziffern enthalten.";
  }

  return null;
}
