export type UserSmtpSettingsPublic = {
  host: string;
  port: number | null;
  username: string;
  fromName: string;
  fromEmail: string;
  /** true = Passwort ist gespeichert (nie Klartext zurückgeben). */
  hasPassword: boolean;
  updatedAt: string;
};

export type UserSmtpSettingsInput = {
  host: string;
  /** null / NaN = nicht gesetzt */
  port: number | null;
  username: string;
  /** Leer lassen = bestehendes Passwort behalten (falls vorhanden). */
  password?: string;
  fromName: string;
  fromEmail: string;
};

export type SmtpConnectionConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
};
