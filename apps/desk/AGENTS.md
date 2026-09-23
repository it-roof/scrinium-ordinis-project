<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

App: **`apps/desk`** (Scrinium Ordinis — Kanzlei-Werkzeug). Monorepo-Hinweise: Root [`AGENTS.md`](../../AGENTS.md).

## Interne Aufgaben (Laufzettel)

**Prinzip:** Ball + Absicht. Verben: Zuweisen · Übergeben · Abschließen.  
Kein Messenger — Telefon für Absprachen, Aufgabe für Ergebnis und Prüfschleifen.

- Persistenz: `staff_messages` (+ Dateien; Protokoll in `staff_message_events`; optional `matter_id`)
- Absender setzt **Priorität** und Inhalt; Ball geht an eine Person mit **Absicht** (Erledigen / Prüfen / Kenntnis / Warten)
- **Akte** optional (empfohlen), bereichsbezogen
- **Meine Aufgaben** (`/…/eingang`): Ball bei mir; Umschalter **Gesendet** (`/…/gesendet`) liegt darunter
- Sidebar **Kommunikation**: Aufgabe zuweisen · Meine Aufgaben
- Prüfschleife = Übergeben auf derselben Karte
- Modul: [`lib/staff-messages/`](lib/staff-messages/) · UI: [`components/auftraege/`](components/auftraege/)

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
- Ersten Benutzer: `pnpm user:create <email> <passwort> <vorname> <nachname> [tenant-slug] [admin|employee] [desk-role] [herr|frau]`
  Desk-Rollen: `rechtsanwalt` · `sekretariat` · `steuerberater` · `stb_sekretariat` (Default: `rechtsanwalt`)
- Plattform-Super-Admin: `pnpm platform:grant <email>` (UI unter `/platform`)
- Geschützte Routen via `middleware.ts`
- Passwort-Policy: min. 6 Zeichen (Admin setzt Passwort; kein Self-Service-Register)
- Login-Rate-Limit: 5 Fehlversuche / 15 Min. pro E-Mail

## Multi-Tenant & Datentrennung

Eine Plattform, strikt getrennte Kanzleidaten (`tenant_id` + App-Scope + Postgres RLS auf Fachdaten).  
Siehe Root [`.cursor/rules/multi-tenant-isolation.mdc`](../../.cursor/rules/multi-tenant-isolation.mdc).

**Zusätzlich:** Innerhalb einer Kanzlei sind Fachinhalte **bereichsgetrennt** (Recht ≠ Steuer).  
Siehe [`.cursor/rules/area-content-isolation.mdc`](../../.cursor/rules/area-content-isolation.mdc).

**Zielbild Zugriff / Practice / Rolle / URLs** (verbindlich für neue Arbeit):  
[`docs/architecture-access-routing.md`](docs/architecture-access-routing.md) · Rule [`.cursor/rules/access-practice-routing.mdc`](../../.cursor/rules/access-practice-routing.mdc)

- **Rollen-Matrix:** `lib/area/desk-roles.ts` — Role = Bundle (Practices + Functions). Effektive Rechte: `getUserAllowedFunctions` / `getUserEffectiveModules`. Guards: `requireDeskUser({ requireFunction })`, `requireDeskPractice`.
- Haupt-Shell: Route-Group `app/(main)/` — alle kanonischen URLs (inkl. `/`, `/dashboard`, `/einstellungen`, `/platform`).
- Practice-scoped Daten: `/r/mandanten`, `/r/akten`, `/r/schreiben`, `/s/dokumentation`, `/s/vorlagen`, …  
  (Slugs: Recht=`r`, Steuer=`s`, Notariat=`n`, Verwaltung=`verwaltung`)
- Links: `hrefFor` in `lib/area/paths.ts` (Vitest: `paths.test.ts`)
- Fachzugriffe über `withTenantDb(tenantId, …)` (`lib/tenant/db.ts`)
- Session-Helfer: `lib/tenant/session.ts`
- Routing: `hrefFor` / `PRACTICE_SLUGS` · `requireDeskPractice` für Practice-URLs
- Enum-Erweiterung: Migration `0062_desk_role_tax`, `0063_module_notary` (`pnpm db:migrate`)
- Platform: schlanke `PlatformShell` (Super-Admin ohne Desk-Rolle)
- Bare `/{practice}` → `/dashboard` (mit Rolle) bzw. `/` (ohne Position)

## Enterprise Lightweight

Professionelle Standards, minimale Komplexität. Siehe `.cursor/rules/enterprise-lightweight.mdc`.

## Module

Modul-Dokumentation: [`docs/README.md`](docs/README.md) · Erstes Modul: [Textbausteine](docs/modules/text-blocks.md)

## Tests (Vitest)

- Runner: Vitest in `apps/desk` — `pnpm test` (Root) bzw. `pnpm --filter @scrinium/desk test`
- Dateien: `lib/**/*.test.ts` neben der Logik
- Fokus: reine kritische Logik (Pseudonymisierung, Consent-Status, EU-Modell-ID, Fehlertexte)
- `server-only` wird in `vitest.setup.ts` gemockt
- Kein Jest/Cypress parallel; E2E (Playwright) später separat
- Neue kritische `lib/`-Helfer: mind. Happy Path + ein Grenzfall

## KI-Gateway (Bedrock EU)

- Code: [`lib/ai/`](lib/ai/) — nur serverseitig (`server-only`), Modell-ID muss mit `eu.` beginnen
- Tabellen: `ai_consents`, `ai_audit`, `ai_drafts`, `ai_jobs`, `matter_parties`
- **KI-Chat** (`/ki`, Function `ai-chat`): Klartext-Chat, Session-only (kein DB-Verlauf); UI-Disclaimer gegen Mandanten-/Falldaten; Audit content-frei ohne `client_id`
- **KI-Analyse** (Akte): Vorschau → Residual-Gate → Job → Entwurf — mit Pseudonymisierung ([`docs/ai-pseudonymization.md`](docs/ai-pseudonymization.md)); EU-Region + EU-Modell-ID; Job-Owner-only; early clear + TTL
- **Vertragsanalyse** (`/vertragsanalyse`, Function `contract-analysis`): Paste → Pseudonym-Vorschau/Gate → Sync-Analyse (Session-Ergebnis, kein Job/Draft); gleicher Pseudonym-Stack wie Analyse, ohne Akte
- Env: `AWS_REGION` (eu-*), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_MODEL_ID` (eu.*), optional `AI_PSEUDONYM_GATE`
- Dev-Debug: nur Test-Kanzlei — `AI_DEBUG=1` + `AI_DEBUG_TENANT_SLUG=test-kanzlei` → `/ai-debug` (kein Super-Admin / keine Platform-UI)
- Tests: siehe Abschnitt Tests oben