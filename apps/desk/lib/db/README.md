# Datenbank & Migrationen (Drizzle)

PostgreSQL wird über **Drizzle ORM** angebunden. Schema-Änderungen laufen **ausschließlich über versionierte SQL-Migrationen** — nicht über `db:push`.

## Workflow bei Schema-Änderungen

1. Schema in `lib/db/schema.ts` anpassen
2. Migration erzeugen: `pnpm db:generate`
3. SQL in `drizzle/` prüfen
4. Migration anwenden: `pnpm db:migrate`
5. Migration committen (`drizzle/*.sql`, `drizzle/meta/`)

## Befehle

| Befehl | Zweck |
|--------|--------|
| `pnpm db:generate` | Migration aus Schema-Diff erzeugen |
| `pnpm db:migrate` | Ausstehende Migrationen auf der DB anwenden |
| `pnpm db:migrate:run` | Gleiches via Drizzle ORM (`lib/db/migrate.ts`) |
| `pnpm db:check` | Schema vs. Migrationen validieren |

## Wichtig

- **`db:push` nicht verwenden** (weder lokal noch auf Prod)
- `.env.local` mit `DATABASE_URL` für lokale Entwicklung
- Migrations-Tracking: Schema `drizzle`, Tabelle `__drizzle_migrations`
- App-Code nutzt `lib/db/index.ts`, nicht direkt SQL für Schema-Änderungen
