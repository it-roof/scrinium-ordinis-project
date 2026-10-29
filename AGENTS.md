# Agent Notes (Monorepo)

Dieses Repository ist ein **Turborepo**:

- `apps/website` — Landingpage (Port 3081)
- `apps/client-doc` — Mandanten-Dokumente (Port 3082)
- `apps/intake` — B2C-Chat „KI Rechtsanwalt“ (Port 3083)
- `apps/matters` — B2B Akten + Dokumente + KI am Fall (Port 3084)
- `apps/desk` — Prompt-Bibliothek / heutiges Kanzlei-Werkzeug (Port 3080; Prod: https://app.scrinium-ordinis.de). Akten-Kern wandert später nach `matters`
- `packages/brand` — gemeinsame Brand-Konstanten

**Produktmarke:** Scrinium.  
**Plattform-Regel:** Eine App für viele Kanzleien, Daten strikt getrennt (`tenant_id` + Postgres RLS, DSGVO).  
Details: [`.cursor/rules/multi-tenant-isolation.mdc`](.cursor/rules/multi-tenant-isolation.mdc)

Desk-spezifische Regeln: [`apps/desk/AGENTS.md`](apps/desk/AGENTS.md)

```bash
pnpm dev           # alle Apps mit `dev`-Script
pnpm dev:desk      # → http://localhost:3080
pnpm dev:website   # → http://localhost:3081
pnpm dev:client-doc # → http://localhost:3082
pnpm dev:intake    # → http://localhost:3083
pnpm dev:matters   # → http://localhost:3084
pnpm build
```
