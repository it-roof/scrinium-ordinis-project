# Modul: Textbausteine

> **Code-Name:** `text-blocks` · **UI-Name:** Textbausteine · **Route:** `/textbausteine`

Wiederverwendbare Texte für Schreiben, E-Mails und Vorlagen — zentral verwaltet und nach Kanzlei-Bereichen strukturiert.

## Zweck

Mitarbeiter können häufig genutzte Formulierungen speichern, suchen, filtern und in die Zwischenablage kopieren. Kein Copy-Paste aus Word-Dateien oder persönlichen Notizen mehr.

## Auth

- **Login erforderlich** — Middleware + Layout prüfen Session
- **Rollen:** Alle angemeldeten User (`admin` und `employee`) haben vollen CRUD-Zugriff
- Server Actions prüfen Session via `requireUser()` in `lib/text-blocks/actions.ts`

## Route & Navigation

| | |
|---|---|
| URL | `/textbausteine` |
| Sidebar | „Textbausteine“ (`lib/navigation.ts`) |
| Seite | `app/(main)/textbausteine/page.tsx` |

Die Route bleibt deutsch (`/textbausteine`), der Code heißt `text-blocks`.

## Datenmodell

### Tabelle `text_blocks`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | `uuid` | Primary Key |
| `title` | `text` | Titel des Bausteins |
| `content` | `text` | Textinhalt |
| `department` | `department` enum | Kanzlei-Bereich |
| `created_at` | `timestamptz` | Angelegt am |
| `updated_at` | `timestamptz` | Zuletzt geändert |

Schema-Definition: `lib/db/schema.ts` → `textBlocks`

### Enum `department`

| DB-Wert (Englisch) | UI-Label (Deutsch) |
|--------------------|--------------------|
| `general` | Allgemein |
| `tax` | Steuerberatung |
| `legal` | Recht |
| `restructuring-insolvency` | Sanierung & Insolvenz |
| `consulting` | Unternehmensberatung |

Labels und Mapping: `lib/text-blocks/types.ts` → `DEPARTMENTS`, `getDepartmentLabel()`

## Code-Struktur

```
lib/text-blocks/
├── types.ts              # TextBlock, TextBlockInput, DEPARTMENTS
├── storage.ts            # DB-Zugriff (Drizzle)
├── actions.ts            # Server Actions (CRUD + Auth)
└── department-styles.ts  # Farben pro Bereich (UI)

components/text-blocks/
├── text-blocks-view.tsx  # Haupt-UI (Liste, Filter, Dialoge)
└── department-badge.tsx  # Bereichs-Badge

app/(main)/textbausteine/
└── page.tsx              # Server Component, lädt initiale Daten
```

## Server Actions

| Action | Datei | Beschreibung |
|--------|-------|--------------|
| `createTextBlock` | `actions.ts` | Neuen Baustein anlegen |
| `updateTextBlock` | `actions.ts` | Bestehenden Baustein bearbeiten |
| `deleteTextBlock` | `actions.ts` | Baustein löschen |

Alle Actions:
- Prüfen Session (`Nicht angemeldet.` bei Fehlschlag)
- Validieren Input (Titel, Inhalt, gültiger `department`)
- Rufen `revalidatePath("/textbausteine")` nach Mutation

Storage-Funktionen (nur intern, kein Auth):

| Funktion | Beschreibung |
|----------|--------------|
| `getTextBlocks` | Alle Bausteine, sortiert nach `updated_at` |
| `createTextBlockRow` | INSERT |
| `updateTextBlockRow` | UPDATE |
| `deleteTextBlockRow` | DELETE |

## UI-Funktionen

- **Suche** — Titel und Inhalt (clientseitig)
- **Bereichsfilter** — Pills mit Zähler pro Department
- **CRUD** — Dialog zum Anlegen/Bearbeiten, AlertDialog zum Löschen
- **Kopieren** — Inhalt in Zwischenablage (`navigator.clipboard`)

Fehler- und Erfolgsmeldungen sind auf Deutsch (Toasts).

## Schema-Änderungen

1. `lib/db/schema.ts` anpassen
2. `pnpm db:generate` → `pnpm db:migrate`
3. Types und Storage in `lib/text-blocks/` aktualisieren
4. UI-Labels in `types.ts` / `department-styles.ts` ergänzen

Siehe [`lib/db/README.md`](../../lib/db/README.md).

## Geplant / offen

- [ ] Berechtigungen feiner (z. B. nur Admin darf löschen)
- [ ] Filter nach User-Bereich (`users.department`)
- [ ] Audit-Log (wer hat was geändert)
- [ ] Export (PDF/Word)

## Migration-Historie

| Migration | Änderung |
|-----------|----------|
| `0000_init` | Tabelle `textbausteine` (deutsche Namen) |
| `0004_english_identifiers` | Umbenennung → `text_blocks`, englische Spalten & Enums |
