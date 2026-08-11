/** Mindestlänge für Admin-/Invite-Passwörter (kein Self-Service-Register). */
export const PASSWORD_MIN_LENGTH = 6;

export function validatePassword(password: string): string | null {
  if (!password.trim()) {
    return "Bitte ein Passwort angeben.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`;
  }

  return null;
}
