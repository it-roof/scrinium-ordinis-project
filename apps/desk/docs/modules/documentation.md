# Modul: Dokumentation

> **Code-Name:** `docs` · **UI-Name:** Dokumentation · **Route:** `/dokumentation`

Internes Wiki light — Seiten mit Markdown, Bereichen, Seitenbaum (max. 2 Ebenen) und Uploads für Bilder/PDFs.

## Zweck

Zentrale Ablage für Anleitungen, Prozesse und internes Wissen. Ähnlich Notion, aber schlank: Markdown statt Block-Editor, Postgres + privater Hetzner Object Storage.

## Auth

- Login erforderlich
- Alle angemeldeten User (`admin`, `employee`) haben CRUD-Zugriff

## Route & Navigation

| | |
|---|---|
| URL | `/dokumentation` |
| Seite lesen | `/dokumentation/[slug]` |
| Anlegen | `/dokumentation/neu` |
| Bearbeiten | `/dokumentation/[slug]/bearbeiten` |
| Dateien | `/api/docs/files/[id]` (auth, signierte S3-URL) |
| Sidebar | „Dokumentation“ |

## Datenmodell

### Tabelle `doc_pages`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | `uuid` | Primary Key |
| `title` | `text` | Seitentitel |
| `slug` | `text` | URL-Slug (eindeutig) |
| `content` | `text` | Markdown |
| `parent_id` | `uuid` | Übergeordnete Seite (null = Root) |
| `sort_order` | `integer` | Sortierung |
| `module` | `module` enum | Kanzlei-Bereich |
| `updated_by` | `uuid` | Zuletzt bearbeitet von |
| `created_at` / `updated_at` | `timestamptz` | Zeitstempel |

Max. **2 Ebenen**: Root-Seiten und deren Unterseiten.

### Tabelle `doc_assets`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | `uuid` | Primary Key |
| `storage_key` | `text` | Pfad im S3-Bucket |
| `filename` | `text` | Originalname |
| `mime_type` | `text` | MIME-Type |
| `size_bytes` | `integer` | Dateigröße |
| `uploaded_by` | `uuid` | User |
| `created_at` | `timestamptz` | Upload-Zeit |

## Object Storage (Hetzner)

Env-Variablen: `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`

- Bucket **privat**
- Upload via Server Action
- Auslieferung nur für eingeloggte User über signierte URLs

Upload-Limits: Bilder max. 10 MB, PDFs max. 25 MB.

## Code-Struktur

```
lib/docs/
├── types.ts
├── slug.ts
├── upload-policy.ts
├── storage.ts
└── actions.ts

lib/storage/
├── config.ts
└── s3.ts

components/docs/
├── docs-shell.tsx
├── doc-sidebar.tsx
├── doc-form.tsx
└── doc-markdown.tsx

app/(main)/dokumentation/
app/api/docs/files/[id]/
```

## Server Actions

| Action | Beschreibung |
|--------|--------------|
| `createDocPage` | Neue Seite |
| `updateDocPage` | Seite bearbeiten |
| `deleteDocPage` | Seite löschen (inkl. Unterseiten per CASCADE) |
| `uploadDocAsset` | Bild/PDF hochladen |
