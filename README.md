# ORGA. Monorepo

Turborepo:

| App | Ordner | Port | Zweck |
|-----|--------|------|--------|
| **desk** | `apps/desk` | 3000 | Internes Kanzlei-Werkzeug |
| **website** | `apps/website` | — | noch nicht angelegt (selbst installieren) |

Shared: `packages/brand` (Produktname, Kanzlei-Name).

## Setup

```bash
pnpm install
```

Env für Desk: `apps/desk/.env.local` (siehe `apps/desk/.env.example`).

## Entwicklung

```bash
pnpm dev          # alle Apps im Workspace
pnpm dev:desk     # nur Desk (http://localhost:3000)
pnpm build
```

## Website selbst anlegen

```bash
cd apps
pnpm create next-app@latest website
```

Package-Name idealerweise `@orga/website`, dann optional:

```json
"dev:website": "turbo run dev --filter=@orga/website"
```

im Root-`package.json` ergänzen.

## Datenbank (Desk)

```bash
pnpm db:generate
pnpm db:migrate
pnpm user:create <email> <passwort> <name> [admin|employee]
```

## Docs

- Desk-Modul-Dokumentation: [`apps/desk/docs/README.md`](apps/desk/docs/README.md)
- Agent-Hinweise: [`apps/desk/AGENTS.md`](apps/desk/AGENTS.md)
