# Modul: Prompt

> **Code-Name:** `prompts` · **UI-Name:** Prompt · **Route:** `/prompt`

Gespeicherte KI-Prompt-Texte — anlegen, taggen, suchen, bearbeiten und mit einem Klick kopieren.

## Zweck

Zentrale Ablage für wiederkehrende Prompt-Formulierungen (z. B. für ChatGPT, Copilot, interne KI-Tools). Ähnlich wie Textbausteine, aber mit freien **Tags** statt Kanzlei-Bereichen.

## Auth

- Login erforderlich
- Alle angemeldeten User (`admin`, `employee`) haben CRUD-Zugriff

## Route & Navigation

| | |
|---|---|
| URL | `/prompt` |
| Anlegen | `/prompt/neu` |
| Bearbeiten | `/prompt/[id]/bearbeiten` |
| Sidebar | „Prompt“ |
| Seite | `app/(main)/prompt/page.tsx` |

## Datenmodell

### Tabelle `prompts`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | `uuid` | Primary Key |
| `title` | `text` | Kurztitel / Bezeichnung |
| `content` | `text` | Prompt-Text |
| `created_at` | `timestamptz` | Angelegt am |
| `updated_at` | `timestamptz` | Zuletzt geändert |

### Tabelle `prompt_tags`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | `uuid` | Primary Key |
| `name` | `text` | Tag-Name (eindeutig, case-insensitive) |
| `created_at` | `timestamptz` | Angelegt am |

### Tabelle `prompt_tag_assignments`

Many-to-many zwischen `prompts` und `prompt_tags` (`prompt_id`, `tag_id`).

Schema: `lib/db/schema.ts`

## Code-Struktur

```
lib/prompts/
├── types.ts
├── tag-utils.ts
├── storage.ts
└── actions.ts

components/prompts/
├── prompts-view.tsx
├── prompt-form.tsx
└── prompt-tags-input.tsx

app/(main)/prompt/
├── page.tsx
├── neu/page.tsx
└── [id]/bearbeiten/page.tsx
```

## Server Actions

| Action | Beschreibung |
|--------|--------------|
| `createPrompt` | Neuen Prompt anlegen (inkl. Tags) |
| `updatePrompt` | Prompt bearbeiten (inkl. Tags) |
| `deletePrompt` | Prompt löschen |

## UI-Funktionen

- Suche (Titel, Tags, Inhalt)
- Tag-Filter in der Übersicht
- Tags beim Anlegen/Bearbeiten (Enter/Komma, Vorschläge aus bestehenden Tags)
- Eigene Seiten für Anlegen/Bearbeiten (scrollbar, auch für lange Texte)
- **Kopieren** — Prompt-Text in Zwischenablage
- Monospace-Darstellung des Prompt-Texts in der Liste

## Abgrenzung zu Textbausteine

| | Textbausteine | Prompt |
|--|---------------|--------|
| Inhalt | Kanzlei-Formulierungen | KI-Prompts |
| Kategorisierung | Feste `module`-Bereiche | Freie Tags |
| Route | `/textbausteine` | `/prompt` |
