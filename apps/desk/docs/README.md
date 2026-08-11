# Scrinium Ordinis — Modul-Dokumentation

Interne Dokumentation für Entwickler und Agenten. **Code und DB auf Englisch**, **UI auf Deutsch**.

## Module

| Modul | UI-Name | Route | Status |
|-------|---------|-------|--------|
| [Textbausteine](./modules/text-blocks.md) | Textbausteine | `/textbausteine` | ✅ aktiv |
| [Dokumentation](./modules/documentation.md) | Dokumentation | `/dokumentation` | ✅ aktiv |
| [Prompt](./modules/prompts.md) | Prompt | `/prompt` | ✅ aktiv |

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
| Datenbank & Migrationen | [`lib/db/README.md`](../lib/db/README.md) |
| Auth & Sessions | [`AGENTS.md`](../AGENTS.md) |
| Enterprise Lightweight | [`.cursor/rules/enterprise-lightweight.mdc`](../.cursor/rules/enterprise-lightweight.mdc) |

## Neues Modul dokumentieren

1. Ordner unter `lib/<module-name>/` anlegen
2. Seite unter `app/(main)/<route>/`
3. Eintrag in `lib/navigation.ts`
4. Modul-Dokument unter `docs/modules/<module-name>.md`
5. Zeile in der Tabelle oben ergänzen
