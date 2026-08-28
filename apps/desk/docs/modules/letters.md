# Modul: Schreiben

> **Code-Name:** `letters` · **UI-Name:** Schreiben · **Route:** `/recht/schreiben`

Textentwürfe (Schreiben, E-Mail, Aktenvermerk) mit Platzhaltern `{{NAME}}`, Export als Anwaltsschreiben nach **PDF** und **Word**. Keine KI-Anbindung — Paste / `.md`-Upload aus externer KI.

Export erkennt Stichpunkte (`- `, `* `, `• `), nummerierte Listen (`1. `) und optionale Markdown-Überschriften (`## `) und setzt sie in PDF/Word als echte Aufzählungen / Zwischenüberschriften um. Import/Export als `.md`-Datei im Editor.

## Workflow

Nach `.md`-Import oder Einfügen: **Schreiben bearbeiten** oder **Delegieren** (bidirektional Anwalt ↔ Mitarbeiter).

| Status | Bedeutung |
|--------|-----------|
| `entwurf` | In Bearbeitung |
| `zur_pruefung` | Warte auf Freigabe |
| `freigegeben` | Versandbereit |
| `versendet` | Per SMTP verschickt |

- `assigned_to` — zuständige Person (Tenant-User)
- Mitarbeiter und Anwalt dürfen bearbeiten und versenden
- Versand über user-SMTP in den Einstellungen

## Auth / Bereich

- Nur Bereich **Recht** (`legal`)
- Login erforderlich; freigeschaltetes Modul Recht
- `tenant_id` + Postgres RLS

## Daten

Tabelle `letters`: Inhalt + `status`, `assigned_to`, `recipient_email`, `sent_at`, `module`, `created_by`, optional `matter_id` (Akte).

Siehe auch [Arbeitsbereich](./workspace.md) (Mandant → Akte → Dokumente / Eingang).

## Code

| | |
|---|---|
| Seiten | `app/(main)/[area]/schreiben/…` |
| UI | `components/letters/` |
| CRUD / Workflow | `lib/letters/actions.ts`, `storage.ts` |
| Platzhalter | `lib/letters/placeholders.ts` |
| Export | `lib/letters/export-pdf.ts`, `export-docx.ts`, `export-actions.ts` |
