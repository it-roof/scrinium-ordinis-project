# Zugriff, Practice & Routing — Architekturentscheidung

**Status:** verbindlich — URL-Kanon + Rollen-Matrix umgesetzt (`app/(main)/`, `lib/area/paths.ts`, `lib/area/desk-roles.ts`)  
**Gilt für:** `apps/desk` (Scrinium Ordinis)  
**Datum:** 2026-09-23  

Dieses Dokument hält die konsolidierte Empfehlung fest: Multi-Tenant, Fachwelten (Practice), Rollen/Funktionen und URL-Struktur — **Enterprise Lightweight**, skalierbar deutschlandweit.

Verwandte Regeln:

- [Multi-Tenant & Datentrennung](../../.cursor/rules/multi-tenant-isolation.mdc)
- [Bereichs-Trennung von Fachinhalten](../../.cursor/rules/area-content-isolation.mdc)
- [Enterprise Lightweight](../../.cursor/rules/enterprise-lightweight.mdc)

> **Ist:** Kanonische URLs unter `app/(main)/` mit Practice-Slugs `r` / `s` / `n` / `verwaltung`. Keine Alias- oder `/v1`-Redirects mehr.

---

## Leitprinzip

**Eine App für viele Kanzleien.** Rechte und Navigation bleiben einfach; Trennung sitzt dort, wo Daten und Haftung sitzen.

Drei Achsen — nicht mehr:

| Achse | Bedeutung | Beispiel |
|-------|-----------|----------|
| **Tenant** | Kanzlei (Kunde der Plattform) | Kanzlei A ≠ Kanzlei B |
| **Practice** | Fachwelt / Datentrennung | Recht ≠ Steuer ≠ Notar |
| **Funktion** | Was jemand tun darf | Prompt ja/nein, Mandanten ja/nein |

**Rolle** = nur Bundle aus Practices + Funktionen (Preset). Keine eigene URL-Hierarchie und keine eigene Mandanten-Welt.

**Begriffe**

| UI / Fach | Code / DB (aktuell) | Hinweis |
|-----------|---------------------|---------|
| Kanzlei | `tenant` / `tenant_id` | Plattform-Kunde |
| Mandant | `client` / `client_id` | Endkunde der Kanzlei |
| Akte | `matter` | |
| Practice / Bereich | oft noch `module` | Zielbegriff Practice; Rename optional später |
| Position / Rolle | `deskRole` / künftig `roles[]` | Preset, keine ACL-Alleinwahrheit |

---

## 1. Datentrennung

### Tenant (Kanzlei)

- Session trägt unveränderlich `tenantId`.
- Fachzugriffe nur über Session-Tenant + `withTenantDb` / `withTenantUserDb`.
- Postgres RLS auf Fachtabellen als zweite Linie (Ziel: wirksam erzwungen, z. B. FORCE + App-DB-Rolle ohne Table-Ownership-Bypass).
- `users` bewusst ohne RLS (Login per E-Mail); Zuordnung über `users.tenant_id`.

### Practice (Fachwelt)

- Mandanten, Akten und andere bereichsgebundene Fachdaten gehören **genau einer** Practice (`legal`, `tax`, `notary`, …).
- UI und Queries scopen auf die **aktive Practice**.
- Freigeschaltete Practices des Tenants (`enabledModules` / künftig `enabledPractices`) bestimmen, welche Welten existieren.

### Support-Rollen teilen die Practice

- **RA-Sekretär** bekommt **keine** eigene Mandanten-Partition.
- Sekretär und Rechtsanwalt teilen Practice `legal` → **gleiche Mandantenliste**.
- Unterschied nur über **Funktionen** (z. B. Sekretär ohne Prompt-Bibliothek).

### Shared Content

- Bewusst praxisübergreifend oder Katalog-Tenant (z. B. gemeinsame Prompt-Bibliothek).
- Keine Mandantendaten in Shared-Katalogen.

---

## 2. Zugriff: Rolle = Bundle, Funktion = ACL

### Effektive Rechte

```text
effektiv =
  Union der Rollen-Bundles
  ∩ Tenant.enabledPractices
  ∩ Tenant-Paket (optional, später)
```

### Prüfung (überall gleich)

```text
darf(user, practice, function) =
  practice ∈ user.practices
  ∧ function ∈ user.functions
  ∧ practice ∈ tenant.enabledPractices
```

Listen und Mutations an Fachdaten zusätzlich: Datensatz-`practice`/`module` = aktive Practice (bzw. explizit erlaubt).

### Rollen-Beispiele (Ziel-Matrix, Code-Preset)

| Rolle | Practices | Funktionen (Auszug) |
|-------|-----------|---------------------|
| `rechtsanwalt` | `legal` | clients, matters, prompts, case-facts-analysis, … |
| `sekretariat` | `legal` | clients, matters, inbox, … — **ohne** prompts / Analyse |
| `steuerberater` | `tax` | clients, matters, docs, templates, … — ohne prompts |
| `stb_sekretariat` | `tax` | clients, matters, inbox, … — ohne prompts |
| `notar` | `notary` | … (später) |

Source of Truth: `lib/area/desk-roles.ts` (`DESK_ROLE_BUNDLES`).

**Multi-Rolle:** Helpers akzeptieren `deskRoles[]` (Union Practices + Functions). Persistenz ist derzeit noch ein einzelnes `users.desk_role`; Array-Spalte folgt bei Bedarf.

- Practices = **Union** → Practice-Switcher (Recht \| Steuer).
- Funktionen = **Union** der Bundles.
- Mandanten bleiben pro Practice getrennt (`/r/mandanten` ≠ `/s/mandanten`).

### Lightweight-Umsetzung

- Rollen→(Practices, Funktionen)-Map **global im Code** (eine Quelle).
- User speichert vor allem zugewiesene Rollen (`roles[]` / heutiges `deskRole` als Vorstufe).
- Optionale Overrides (`allowedFunctions`) erst bei nachgewiesenem Bedarf.
- Kein schweres RBAC-Framework.
- Server Actions / Guards prüfen **Funktion** (und Practice wo nötig) — nicht den Rollennamen allein.

### Grenzen (bewusst)

- Kein per-Mandant- / per-Dokument-ACL im Kernmodell.
- Practice×Funktion-Matrix erst wenn echte Fälle es erzwingen (z. B. Feature nur in Recht).
- Sonderlocken pro Kanzlei vermeiden; wiederkehrende Bedarfe → Standardrolle oder Tenant-Paket.

---

## 3. URL- & Navigationszielbild

### Prinzipien

1. Eine kanonische Route-Map / `hrefFor(...)` — kein paralleler URL-Baum.
2. **Practice in der URL nur**, wenn Daten bereichsgetrennt sind.
3. Stabile Practice-Slugs (`r`, `s`, `n`, `verwaltung`) und deutsche Funktions-Segmente (`mandanten`, …).
4. Cookie höchstens „letzte Practice“, nie alleinige Wahrheit für Listen-URLs.

### Kanonische Muster

**Practice-scoped (Datentrennung sichtbar)**

- `/{practice}/mandanten`, `/{practice}/mandanten/[id]`
- `/{practice}/akten`, …
- `/{practice}/textbausteine`, Schreiben, Doku, Vorlagen, Analyse (soweit bereichsgebunden)

Practice-Slugs: `r` ← `legal` (Recht), `s` ← `tax` (Steuer), `n` ← `notary` (Notariat), `verwaltung` ← `administration`.

**Flach (kanzleiweit / persönlich / shared)**

- `/dashboard`
- `/prompt` (Shared-Katalog)
- `/notizen`
- `/eingang`, `/gesendet`, `/zuweisen`
- `/einstellungen`
- `/platform` (Super-Admin)

### Navigation

- Nach **Funktionen** gruppiert (Daten, Kommunikation, Werkzeuge), gefiltert nach effektiven Rechten und aktiver Practice.
- **Nicht** nach Berufsbezeichnung als URL-Baum (`/rechtsanwalt/...`).
- Rolle steuert Defaults und Nav-Filter, nicht die Sitemap-Architektur.

---

## 4. Deutschlandweite Skalierung

- Skalierung über **viele Tenants + gleiche Produktmatrix**, nicht Custom-Forks pro Kanzlei.
- Onboarding: Practices freischalten + Admin + Rollen-Presets.
- Später Feature-Pakete als **Schnittmenge** mit Rollen-Funktionen — kein zweites Rechtesystem.
- Priorität Nr. 1: harte **Tenant-Isolation** (App + DB).
- Kein Routing nach Bundesland/Kammer; kein Standard-Deploy pro Kanzlei.
- Neue Standardrolle in der **globalen** Map, wenn viele Tenants dasselbe brauchen; keine einmaligen Sonderpfade.

---

## 5. Explizit nicht tun

- App primär nach Rolle schneiden (`/rechtsanwalt/...`)
- „Bereich = Rolle“ (Sekretär-Bereich mit eigenen Mandanten)
- Drei parallele URL-Welten dauerhaft pflegen
- Rechte nur im UI filtern ohne Server-Check
- Enterprise-IAM-/RBAC-Framework ohne Bedarf
- Isolation nur der App anvertrauen ohne DB-Absicherung (RLS)

---

## 6. Umsetzungsreihenfolge

1. ~~Rollen-Matrix (Code) und Practice/Function-Semantik in Guards~~ — erledigt (`desk-roles.ts`, `getUserAllowedFunctions` / `getUserEffectiveModules`, `requireDeskUser` / `requireDeskPractice`)
2. ~~URL-Kanon (`r`/`s`/`n`, flache Shared-URLs, Middleware für Flat→Practice)~~ — erledigt
3. ~~Nav/Links über `hrefFor` / Route-Map; eine App-Shell~~ — erledigt  
   Root `/` und bare `/{practice}` leben unter `app/(main)/`.
4. RLS härten (FORCE / geeignete DB-Rolle) — bewusst später
5. Multi-Rolle als `roles[]` in der DB — bewusst später (Helpers schon bereit)

---

## 7. Kurzfassung

**Tenant trennt Kanzleien, Practice trennt Fachwelten und Mandanten, Funktion trennt Können, Rolle schnürt Presets — URLs flach, Practice nur wo Daten getrennt sind; deutschlandweit eine Matrix, viele Tenants.**
