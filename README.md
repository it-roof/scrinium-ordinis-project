# Scrinium Ordinis Monorepo

Turborepo:

| App | Ordner | Port | Zweck |
|-----|--------|------|--------|
| **desk** | `apps/desk` | 3000 | Kanzlei-Werkzeug (Multi-Tenant) — Prod: https://app.scrinium-ordinis.de |
| **website** | `apps/website` | 3001 | Produkt-Website |

Shared: `packages/brand` (Produktname Scrinium Ordinis, Tenant-Defaults).

## Setup

```bash
pnpm install
```

Env für Desk: `apps/desk/.env.local` (siehe `apps/desk/.env.example`).

## Entwicklung

```bash
pnpm dev          # Desk + Website
pnpm dev:desk     # nur Desk → http://localhost:3000
pnpm dev:website  # nur Website → http://localhost:3001
pnpm build
```

## Datenbank (Desk)

```bash
pnpm db:generate
pnpm db:migrate   # lokal gegen die Live-DB (nicht im Coolify-Container)
pnpm user:create <email> <passwort> <name> [tenant-slug] [admin|employee]
```

## Coolify (Desk)

Produktion: **https://app.scrinium-ordinis.de**

1. Build-Context: **Repository-Root**
2. Dockerfile: `apps/desk/Dockerfile`
3. Port: `3000`
4. Env laut `apps/desk/.env.example` setzen — mind. `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL=https://app.scrinium-ordinis.de`, `AUTH_TRUST_HOST=true`, S3
5. Migrationen **vor** dem Deploy lokal ausführen (`pnpm db:migrate`)

Lokal Image testen:

```bash
docker build -f apps/desk/Dockerfile -t scrinium-desk .
docker run --rm -p 3000:3000 --env-file apps/desk/.env.local scrinium-desk
```

## Docs

- Desk-Modul-Dokumentation: [`apps/desk/docs/README.md`](apps/desk/docs/README.md)
- Agent-Hinweise: [`apps/desk/AGENTS.md`](apps/desk/AGENTS.md)
