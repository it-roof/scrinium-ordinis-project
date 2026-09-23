# Arbeitsbereich: Mandanten, Akten, Eingang

## Struktur

```
Mandant (Firma | Privatperson)
  Firma → Personen (mehrere)
  beide → Akte (mehrere) → Dokumente (Schreiben …)
                         ↘ Aufgaben erscheinen im Eingang
```

| Begriff | Route | Code |
|---------|-------|------|
| Eingang | `/eingang` | `inbox` |
| Mandanten | `/r/mandanten` | `clients` (`kind`: `company` \| `person`) |
| Akten | `/r/akten` | `matters` |
| Personen | nur bei Firma | `client_persons` |
| Akte (Detail) | `/r/akten/[id]` | `matters` |
| Schreiben | `/r/schreiben` | `letters` (+ `matter_id`) |

## Regeln

- `tenant_id` + Postgres RLS auf `clients`, `client_persons` und `matters`
- Bereichsfeld `module` an Mandant/Akte (Recht = `legal`)
- `clients.kind`: `company` (Firma) oder `person` (Privatperson)
- Personen (`client_persons`) nur bei Firmen; Privatpersonen tragen Stammdaten direkt auf `clients`
- Firma: Name, Adresse, Notiz — Kontakte über Personen
- Privatperson: Anrede, Vor-/Nachname, Adresse, E-Mail, Telefon, Mobil, Notiz
- `clients.name` ist Anzeigename (Firmenname bzw. „Vorname Nachname“)
- Schreiben optional an Akte gebunden
- Eingang = Schreiben mit `assigned_to = aktueller User`, Status ≠ versendet

## Delegation

Weiterhin bidirektional über Schreiben-Workflow (Zuweisung + Status). Eingang ist die Arbeitsliste dafür.
