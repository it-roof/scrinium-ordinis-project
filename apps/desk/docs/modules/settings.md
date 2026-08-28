# Persönliche Einstellungen — Konto

> **Code:** `lib/settings/` · **UI:** Einstellungen · **Route:** `/einstellungen`

## Bereiche

| Bereich | Inhalt |
|---------|--------|
| Konto | Name ändern, Login-E-Mail (Anzeige), Passwort ändern |
| E-Mail-Versand | [SMTP](./smtp-settings.md) |

## Passwort ändern

- Aktuelles Passwort muss stimmen
- Policy: min. 6 Zeichen
- Alle anderen Sessions werden beendet; die aktuelle Sitzung wird neu ausgestellt
- Alternativ: **Link per E-Mail senden** (ohne aktuelles Passwort)
- Login: „Passwort vergessen?“ → `/passwort-vergessen`
- Reset-Seite: `/passwort-zuruecksetzen?token=…`
- Versand über Transaktionsmail (`MAIL_*` in Env)