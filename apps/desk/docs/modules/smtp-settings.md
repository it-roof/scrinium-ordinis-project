# Persönliche Einstellungen — SMTP

> **Code:** `lib/smtp/` · **UI:** Einstellungen · **Route:** `/einstellungen`

Jeder Benutzer hinterlegt sein eigenes SMTP-Konto, um später Mails **als er selbst** an Mandanten zu senden.

Konto-Bereich (Name, Passwort): siehe [settings.md](./settings.md).

## Zweck

- Felder optional — schrittweises Speichern möglich
- Testmail braucht vollständige Angaben (Host, Port, Benutzer, Passwort, Absender-E-Mail)
- Beliebige Empfänger-Adresse für Testmail

## Auth

- Login erforderlich
- Nur der eigene Datensatz (`user_id` = Session)
- Kanzlei-Admin und Plattform-Super-Admin sehen fremde SMTP-Daten **nicht**

## Datenmodell

Tabelle `user_smtp_settings`: `tenant_id`, `user_id` (unique), `host`, `port`, `username`, `password_encrypted`, `from_name`, `from_email`.

RLS: Tenant-Isolation wie bei anderen Fachtabellen. App filtert zusätzlich strikt auf `user_id`.

## Geheimnisse

- Env: `ENCRYPTION_KEY` (bevorzugt) oder Fallback `AUTH_SECRET`
- Passwort wird in der UI nie wieder im Klartext geliefert

## Erweiterung

Versand an Mandanten nutzt später `getUserSmtpConnectionConfig` + `sendMailWithUserSmtp`.
