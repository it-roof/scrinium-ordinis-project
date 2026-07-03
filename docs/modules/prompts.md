# Modul: Prompt

> **Code-Name:** `prompts` · **UI-Name:** Prompt · **Route:** `/prompt`

Gespeicherte KI-Prompt-Texte — anlegen, suchen, bearbeiten und mit einem Klick kopieren.

## Zweck

Zentrale Ablage für wiederkehrende Prompt-Formulierungen (z. B. für ChatGPT, Copilot, interne KI-Tools). Ähnlich wie Textbausteine, aber ohne Kanzlei-Bereiche — nur Titel + Prompt-Text.

## Auth

- Login erforderlich
- Alle angemeldeten User (`admin`, `employee`) haben CRUD-Zugriff

## Route & Navigation

| | |
|---|---|
| URL | `/prompt` |
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

Schema: `lib/db/schema.ts` → `prompts`

## Code-Struktur

```
lib/prompts/
├── types.ts
├── storage.ts
└── actions.ts

components/prompts/
└── prompts-view.tsx

app/(main)/prompt/
└── page.tsx
```

## Server Actions

| Action | Beschreibung |
|--------|--------------|
| `createPrompt` | Neuen Prompt anlegen |
| `updatePrompt` | Prompt bearbeiten |
| `deletePrompt` | Prompt löschen |

## UI-Funktionen

- Suche (Titel + Inhalt)
- CRUD-Dialoge
- **Kopieren** — Prompt-Text in Zwischenablage
- Monospace-Darstellung des Prompt-Texts in der Liste

## Abgrenzung zu Textbausteine

| | Textbausteine | Prompt |
|--|---------------|--------|
| Inhalt | Kanzlei-Formulierungen | KI-Prompts |
| Bereiche | `department`-Filter | Keine |
| Route | `/textbausteine` | `/prompt` |
