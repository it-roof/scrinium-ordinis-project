# KI-Pseudonymisierung

Stand: Produktentscheidung Scrinium Ordinis Desk · Anwaltsgeheimnis / DSGVO.

Klartext darf die eigene Infrastruktur erst **nach** Pseudonymisierung Richtung Bedrock (EU) verlassen — **für die KI-Analyse (Akten-Sachverhalt) und die Vertragsanalyse**. Der freie **KI-Chat** (`/ki`) sendet bewusst Klartext (Session-only, Disclaimer in der UI: keine Mandanten-/Falldaten). Es gibt **keine 100 %-Garantie**; Ziel ist maximale praktische Absicherung bei einfacher UX für Anwälte.

## Stufe 1 (aktiv)

Ersetzung aus:

- Mandant und `matter_parties` (DB)
- feste Muster (IBAN, E-Mail, Telefon, Gerichts-AZ)

Code: [`lib/ai/pseudonymize.ts`](../lib/ai/pseudonymize.ts), Kontext: [`lib/ai/context.ts`](../lib/ai/context.ts).

## Stufe 2 (aktiv, eigene Software)

Automatische Erkennung verdächtiger Namen/Firmen **lokal in Desk** ([`lib/ai/ner-local.ts`](../lib/ai/ner-local.ts)) — Heuristik (Großschreib-Sequenzen, Firmenformen), **kein** Cloud-NER vor Bedrock.

Später optional: Presidio/spaCy als Sidecar in derselben Infra (weiterhin kein Drittanbieter vor Pseudonymisierung).

Pipeline: Stufe 1 → lokales NER → Rest-Heuristik → Pflicht-Vorschau → Gate → Job/Bedrock.

## Gate-Policy

Env: `AI_PSEUDONYM_GATE=block|warn` (Default: **`block`**).

### Aktive Policy B — `block` (Default)

- Vorschau listet **blockierende Reste** (noch unklare Treffer, inkl. Einzel-Tokens wie Nachnamen).
- Anwalt muss jeden Rest **als `[OTHER]` markieren** oder **als „kein Personenbezug“ bestätigen** (`dismissedResiduals`).
- Server startet den Bedrock-Job **nur**, wenn keine Reste mehr offen sind (nicht nur UI-Disable). Worker prüft erneut.
- Nur serverseitig erkannte Reste dürfen dismissed werden (erfundene Freigaben greifen nicht).
- Fehlercode: `RESIDUAL_PII`.

### Alternative Policy A — `warn` (nicht Default)

Nur dokumentiert / per Env umschaltbar:

- Vorschau **warnt** bei Resten, Anwalt darf trotzdem senden.
- Geeignet, wenn Usability vor Maximal-Schutz priorisiert wird (z. B. interne Testphase).
- Umschalten: `AI_PSEUDONYM_GATE=warn` in der Env, Desk neu starten.
- Serverseitig: Start erlaubt trotz offener Reste; Audit unverändert content-frei.

**Nicht** in Marketing behaupten, Policy A sei gleichwertig zu B. **Prod: `block`.**

## UX (Anwält:innen)

1. Sachverhalt eingeben  
2. „Mit KI analysieren“ → Vorschau (pseudonymisiert)  
3. Offene Reste markieren oder freigeben  
4. Erst dann „Bestätigen und analysieren“  

Parteien an der Akte bleiben sinnvoll, sind aber nicht die einzige Schutzschicht.

## Sicherheit (Checkliste)

| Maßnahme | Status |
|----------|--------|
| Consent vor Preview/Job + erneut im Worker | ja |
| Gate serverseitig Start **und** Worker (`block`) | ja |
| Mapping nie an Browser / nie in Audit | ja |
| Debug-Zwischenstände nur Debug-Tenant | ja |
| Bedrock nur `eu.`-Modell **und** `AWS_REGION=eu-*` | ja |
| Job-Status nur für Job-Owner (kein Tenant-IDOR) | ja |
| `input_facts` + Marks sofort nach Worker-Load null | ja |
| Stale pending/running Jobs (>15 Min Klartext / >30 Min hang) → fail + wipe | ja |
| Debug-Trace nur `AI_DEBUG` + `AI_DEBUG_TENANT_SLUG` | ja |
| Input-Limits (Facts/Marks/Dismissals) | ja |
| RLS auf `ai_*` Tabellen | ja |
| Audit nur Metadaten (kein Prompt/Response) | ja |

### Limits & Persistenz (technisch)

| Größe | Wert |
|-------|------|
| Sachverhalt max. | 50 000 Zeichen (`AI_FACTS_MAX_CHARS`) |
| Manuelle Marks | max. 50 × 200 Zeichen |
| Dismissals | max. 50 × 200 Zeichen; nur Treffer aus Server-Residual-Liste |
| Klartext-TTL am Job | 15 Min pending / running-with-facts; 30 Min hung after early clear (`AI_JOB_SECRETS_TTL_MS`) → fail + wipe. Reap läuft tenant-weit bei Preview/Start/Status. |

Job-Spalten (temporär): `input_facts`, `manual_marks`, `dismissed_residuals` — nach Worker-Load bzw. Abschluss null/leer. Migrationen: `0058`–`0061`.

### Bewusst akzeptiert / Rest-Risiko

- **Keine 100 %-Erkennung:** Heuristik kann ungewöhnliche Schreibweisen oder Kontexte verfehlen; Gate + Anwalts-Review kompensieren.
- Anwalt kann Reste als „kein Personenbezug“ freigeben (Threat-Model: Schutz vor AWS, nicht vor dem berechtigten Anwalt).
- Kurz Klartext in `ai_jobs.input_facts` zwischen Create und Worker-Load (Sekunden); danach null. Marks/Dismissals ebenso.
- Entwurf (`ai_drafts.content`) ist nach Analyse re-personalisiert (Klartext) — tenant-scoped, für die Akte gedacht.

## Verwandt

- Debug (nur Test-Kanzlei): `/ai-debug` · `AI_DEBUG` + `AI_DEBUG_TENANT_SLUG`
- [`AGENTS.md`](../AGENTS.md) · KI-Gateway
