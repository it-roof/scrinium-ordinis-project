<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

App: **`apps/desk`** (Scrinium Ordinis — Kanzlei-Werkzeug). Monorepo-Hinweise: Root [`AGENTS.md`](../../AGENTS.md).

## Interne Nachrichten (V1)

**Prinzip:** Einseitige Nachricht + optionaler Kommentar bei Statusänderung.  
Kein Messenger — Telefon für Absprachen, Nachrichten für Aufgaben und Ergebnisse.

- Persistenz: `staff_messages` (+ Dateien; Kommentare in `staff_message_replies`)
- Absender setzt **Priorität** (Sofort / Heute / Diese Woche / Keine) und Inhalt
- Empfänger setzt **Status** frei: Offen · In Bearbeitung · Erledigt (+ optional Kommentar)
- **Eingang** (`/…/eingang`): Nachrichten an mich
- **Gesendet** (`/…/gesendet`): von mir gesendet — Status und Kommentare lesen
- Sidebar **Nachrichten**: Nachricht schreiben · Eingang · Gesendet
- Rückfrage / neue Richtung = **neue** Nachricht
- Verfassen: `nachrichten-an-mitarbeiter` · Modul: [`lib/staff-messages/`](lib/staff-messages/)

## Datenbank (Drizzle)

- PostgreSQL über Drizzle ORM (`lib/db/`)
- Schema-Änderungen **nur** via `pnpm db:generate` → `pnpm db:migrate` (vom Repo-Root)
- **Nie** `db:push` verwenden
- Siehe `lib/db/README.md` und `.cursor/rules/drizzle-migrations.mdc`

## Auth (NextAuth / Auth.js)

- E-Mail + Passwort (Server Action + DB-Sessions)
- Sessions in PostgreSQL via `@auth/drizzle-adapter`
- Session enthält `id`, `role`, **`tenantId`**
- Konfiguration in `lib/auth/`
- Ersten Tenant (falls nötig): `pnpm tenant:create`
- Ersten Benutzer: `pnpm user:create <email> <passwort> <vorname> <nachname> [tenant-slug] [admin|employee] [rechtsanwalt|sekretariat]`
- Plattform-Super-Admin: `pnpm platform:grant <email>` (UI unter `/platform`)
- Geschützte Routen via `middleware.ts`
- Passwort-Policy: min. 6 Zeichen (Admin setzt Passwort; kein Self-Service-Register)
- Login-Rate-Limit: 5 Fehlversuche / 15 Min. pro E-Mail

## Multi-Tenant & Datentrennung

Eine Plattform, strikt getrennte Kanzleidaten (`tenant_id` + App-Scope + Postgres RLS auf Fachdaten).  
Siehe Root [`.cursor/rules/multi-tenant-isolation.mdc`](../../.cursor/rules/multi-tenant-isolation.mdc).

**Zusätzlich:** Innerhalb einer Kanzlei sind Fachinhalte **bereichsgetrennt** (Recht ≠ Steuer).  
Siehe [`.cursor/rules/area-content-isolation.mdc`](../../.cursor/rules/area-content-isolation.mdc).

- Fachzugriffe über `withTenantDb(tenantId, …)` (`lib/tenant/db.ts`)
- Session-Helfer: `lib/tenant/session.ts`

## Enterprise Lightweight

Professionelle Standards, minimale Komplexität. Siehe `.cursor/rules/enterprise-lightweight.mdc`.

## Module

Modul-Dokumentation: [`docs/README.md`](docs/README.md) · Erstes Modul: [Textbausteine](docs/modules/text-blocks.md)
