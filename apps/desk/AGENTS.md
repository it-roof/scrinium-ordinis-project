<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

App: **`apps/desk`** (Scrinium Ordinis — Kanzlei-Werkzeug). Monorepo-Hinweise: Root [`AGENTS.md`](../../AGENTS.md).

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
- Ersten Benutzer: `pnpm user:create <email> <passwort> <name> [tenant-slug] [admin|employee]`
- Plattform-Super-Admin: `pnpm platform:grant <email>` (UI unter `/platform`)
- Geschützte Routen via `middleware.ts`
- Passwort-Policy: min. 12 Zeichen, Buchstaben + Ziffern
- Login-Rate-Limit: 5 Fehlversuche / 15 Min. pro E-Mail

## Multi-Tenant & Datentrennung

Eine Plattform, strikt getrennte Kanzleidaten (`tenant_id` + App-Scope + Postgres RLS auf Fachdaten).  
Siehe Root [`.cursor/rules/multi-tenant-isolation.mdc`](../../.cursor/rules/multi-tenant-isolation.mdc).

- Fachzugriffe über `withTenantDb(tenantId, …)` (`lib/tenant/db.ts`)
- Session-Helfer: `lib/tenant/session.ts`

## Enterprise Lightweight

Professionelle Standards, minimale Komplexität. Siehe `.cursor/rules/enterprise-lightweight.mdc`.

## Module

Modul-Dokumentation: [`docs/README.md`](docs/README.md) · Erstes Modul: [Textbausteine](docs/modules/text-blocks.md)
