# Scrinium Ordinis — Modul-Dokumentation

Interne Dokumentation für Entwickler und Agenten. **Code und DB auf Englisch**, **UI auf Deutsch**.

## Module

| Modul | UI-Name | Route | Status |
|-------|---------|-------|--------|
| [Textbausteine](./modules/text-blocks.md) | Textbausteine | `/{practice}/textbausteine` | ✅ aktiv |
| [Dokumentation](./modules/documentation.md) | Dokumentation | `/{practice}/dokumentation` | ✅ aktiv |
| [Prompt](./modules/prompts.md) | Prompt-Bibliothek | `/prompt` | ✅ aktiv |
| [Prompt-Baukasten](./modules/prompt-kit.md) | Sachverhalt verarbeiten | — | ⏸ Code ohne Route |
| [Schreiben](./modules/letters.md) | Schreiben | `/{practice}/schreiben` | ✅ aktiv |
| [Arbeitsbereich](./modules/workspace.md) | Eingang / Mandanten / Akten | `/eingang`, `/{practice}/mandanten` | ✅ aktiv |
| [SMTP-Einstellungen](./modules/smtp-settings.md) | Einstellungen (SMTP) | `/einstellungen` | ✅ aktiv |
| [Konto-Einstellungen](./modules/settings.md) | Einstellungen (Konto) | `/einstellungen` | ✅ aktiv |

## Konventionen

Jedes Modul-Dokument beschreibt:

- **Zweck** — Was löst das Modul für die Kanzlei?
- **Route & Navigation** — URL und Sidebar-Eintrag
- **Auth** — Wer darf zugreifen?
- **Datenmodell** — Tabellen, Enums, Types
- **Code-Struktur** — Ordner, Server Actions, Komponenten
- **Erweiterung** — Wie man das Modul weiterentwickelt

## Querschnitt

| Thema | Dokumentation |
|-------|---------------|
| **Zugriff, Practice & Routing (Zielbild)** | [`architecture-access-routing.md`](./architecture-access-routing.md) |
| Datenbank & Migrationen | [`lib/db/README.md`](../lib/db/README.md) |
| Auth & Sessions | [`AGENTS.md`](../AGENTS.md) |
| KI-Pseudonymisierung | [`ai-pseudonymization.md`](./ai-pseudonymization.md) |
| Enterprise Lightweight | [`.cursor/rules/enterprise-lightweight.mdc`](../../.cursor/rules/enterprise-lightweight.mdc) |
| Multi-Tenant | [`.cursor/rules/multi-tenant-isolation.mdc`](../../.cursor/rules/multi-tenant-isolation.mdc) |
| Bereichs-Inhalte | [`.cursor/rules/area-content-isolation.mdc`](../../.cursor/rules/area-content-isolation.mdc) |
| Zugriff/Practice/Routing (Rule) | [`.cursor/rules/access-practice-routing.mdc`](../../.cursor/rules/access-practice-routing.mdc) |

## Neues Modul dokumentieren

1. Ordner unter `lib/<module-name>/` anlegen
2. Seite unter `app/(main)/` (flach oder `[practice]/…`)
3. Eintrag in `lib/area/desk-roles.ts` / `hrefFor` falls nötig
4. Modul-Dokument unter `docs/modules/<module-name>.md`
5. Zeile in der Tabelle oben ergänzen
