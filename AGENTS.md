# Agent Notes (Monorepo)

Dieses Repository ist ein **Turborepo**:

- `apps/desk` — Scrinium Ordinis (Kanzlei-Werkzeug, Multi-Tenant, Port 3000)
- `apps/website` — Scrinium Ordinis (Produkt-Website, Port 3001)
- `packages/brand` — gemeinsame Brand-Konstanten

**Produktmarke:** Scrinium Ordinis.  
**Plattform-Regel:** Eine App für viele Kanzleien, Daten strikt getrennt (`tenant_id` + Postgres RLS, DSGVO).  
Details: [`.cursor/rules/multi-tenant-isolation.mdc`](.cursor/rules/multi-tenant-isolation.mdc)

Desk-spezifische Regeln: [`apps/desk/AGENTS.md`](apps/desk/AGENTS.md)

```bash
pnpm dev          # Desk + Website
pnpm dev:desk     # nur Desk → http://localhost:3000
pnpm dev:website  # nur Website → http://localhost:3001
pnpm build
```
