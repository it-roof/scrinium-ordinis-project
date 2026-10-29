# KI-Chat & vordefinierte Aktionen (Konzept)

Stand: Produktentscheidung Scrinium Desk · lebendes Konzept (bei Entscheidungen aktualisieren).

Ziel: Claude-ähnlicher **regulierter** Chat, in dem eine **Arbeit zu Ende gebracht** werden kann (schildern → mit KI arbeiten → Ergebnis → öffnen/drucken/versenden). Desk orchestriert; kein Agent-Framework.

Verwandt: [`ai-pseudonymization.md`](./ai-pseudonymization.md) · Prompt-Bibliothek bleibt **separat** ([`modules/prompts.md`](./modules/prompts.md)).

---

## Ein Einstieg (regulierter Chat)

| Einstieg | Zweck | Daten | Persistenz |
|----------|--------|--------|-------------|
| **Akten-Chat** (reguliert) | Allgemeiner KI-Dialog + optionale Fallarbeit | Immer Pseudonym vor Bedrock; Akte optional | DB: `matter_ai_chats` / `matter_ai_chat_messages` |

**Freier Chat (`/ki`)** ist entfernt (kein Klartext-Pfad mehr).

- Sidebar → neuer Chat (auch ohne Akte → „Nicht zugeordnet“ unter Akten).
- Akte kann später zugeordnet werden; ohne Akte: Dialog mit Pseudonym, Fallwerkzeuge brauchen Akte + Mandanten-Einwilligung.
- Kontext-Rail nur mit Akte.

---

## Leitprinzip: Artefakt-zentriert (nicht Phasen)

**Entscheidung:** Keine Badge-Phasen (kein Ein-/Ausblenden nach Arbeitsschritt). Kein Intent-Router, der Aktionen „intelligent“ wegnimmt.

Stattdessen zwei Schichten:

1. **Badges** = stabile **Start-Werkzeuge** („Was will ich anstoßen?“).
2. **Artefakt-Aktionen** = Buttons **am Ergebnis im Thread** („Was mache ich damit?“).

Begründung: Anwälte springen und wiederholen Schritte. Harte Phasen wirken wie Wizard oder Bug. Der Abschluss einer Arbeit hängt am **sichtbaren Arbeitsprodukt** (Analyse, Schreiben, E-Mail-Draft), nicht an einer wechselnden Menüleiste.

```
Dialog / Badges  →  Ergebnis-Message im Thread  →  Aktionen am Artefakt
                         (Analyse, Schreiben, …)      (Öffnen, PDF, Senden, …)
```

Beispiel-Pfad (vollständig):

1. Sachverhalt schildern (Dialog und/oder Analyse-Badge)
2. Mit KI klären (Analyse, Gegenprüfung, Dialog)
3. Schreiben erstellen (Badge oder CTA am Analyse-Ergebnis)
4. Am Schreib-Ergebnis: öffnen · PDF/DOCX · ggf. E-Mail-Text / senden

---

## Vordefinierte Aktionen

### A) Start-Werkzeuge (Badges über dem Composer)

Nur Prompt-Jobs. Liste bleibt kurz und **stabil** (Reihenfolge fest).

| Aktion | Badge | Voraussetzung |
|--------|-------|----------------|
| Regulierter Dialog | — (Chat selbst) | Pseudonym-Pipeline |
| Sachverhalt analysieren | ja | Akte + Consent |
| Gegenprüfung | ja | Akte + Consent |
| Schreiben erstellen | ja | Akte + Consent |
| E-Mail-Text erstellen | ja | Akte + Consent |

Label über der Leiste: **„Vorschläge:“**.

### B) Folgeaktionen am Artefakt (kein Badge)

| Artefakt im Thread | Aktionen | Voraussetzung |
|--------------------|----------|----------------|
| Analyse- / Gegenprüfungs-Ergebnis | Schreiben daraus (optional: E-Mail-Text) | Akte + Consent |
| Schreiben angelegt | Öffnen (Editor), PDF, DOCX; optional E-Mail-Text | Akte; Letter existiert (`letter_id` am Chat) |
| E-Mail-Draft | E-Mail senden | Akte + Consent + SMTP |

**Nicht** als Badge: Öffnen/Speichern, Drucken/Download, E-Mail senden — das sind Abschluss-Schritte am Ergebnis.

**Vertragsanalyse** gehört nicht zum Chat-Konzept v1.

### Bewusst verworfen

| Idee | Warum nicht |
|------|-------------|
| Harte Phasen-Badges | Unvorhersehbar, Wizard-Gefühl, Überspringen erschwert |
| Weiches Ranking / „KI wählt nächste Badge“ | Nice-to-have später; kein Muss für v1 |
| Tool-Calling-Agent | Desk bleibt Orchestrator fester Schritte |

Optional später (nicht v1): ein dezent hervorgehobener Hinweis „Nächster Schritt“ — **ohne** andere Aktionen zu verstecken.

---

## UX-Leitlinie

- Claude-Feeling: Composer, Verlauf, Assistant-Antworten im Thread
- Badges = Einstieg; Abschluss = Aktionszeile unter dem jeweiligen Ergebnis
- Ohne Akte: Badges sichtbar; Klick → **Akte zuordnen**; keine Kontext-Rail; Dialog mit Pseudonym bleibt
- Mit Akte: Rail (Akte/Mandant); Badge-Jobs und Artefakt-Aktionen bei Consent
- Consent ohne Akte: freie Dialog-Turns mit Pseudonym; Badge-/Artefakt-Jobs nur mit Akte + Einwilligung

---

## Persistenz

```
Practice (tenant + module)
 ├── Chat ohne Akte („Nicht zugeordnet“)
 └── Akte (≈ Projekt)
      ├── Chat 1
      └── Chat n
```

| Ebene | Speichert |
|-------|-----------|
| **Chat** | Thread (Titel, Timestamps, optional `matter_id`, optional `letter_id`) |
| **Message** | User / Assistant (Klartext im Desk; `actionId` markiert Werkzeug-Ergebnisse) |

Vor Bedrock: Pseudonym-Pipeline; Mapping nicht dauerhaft archivieren.

Schreiben aus dem Chat: Letter-Datensatz + `matter_ai_chats.letter_id` (neuestes Schreiben am Chat). Artefakt-Aktionen nutzen diese ID, nicht Regex auf Message-Text.

---

## Architektur-Prinzipien

- Claude formuliert; Desk orchestriert feste Schritte (Badges + Artefakt-CTAs)
- Kein Tool-Calling-Agent
- Immer Pseudonym vor Bedrock (auch ohne Akte)
- Audit content-frei
- ACL: Function `akten-chat` (+ Analyse/Letters für Jobs)

---

## Umsetzungsstand

1. Konzept regulierter Chat — ✅
2. Persistenz matter_ai_chats (`matter_id` nullable) — ✅
3. Dialog-Turn mit Pseudonym + Assistant-Reply — ✅
4. Badge-Workflows an Akte (Analyse, Gegenprüfung, Schreiben, E-Mail-Text) — ✅
5. Freier Chat entfernt — ✅
6. Akte zuordnen (Dialog) — ✅
7. **Konzept Artefakt-Aktionen** — ✅ (dieses Dokument)
8. Umsetzung Artefakt-Aktionen + Badge-Leiste schrumpfen — ✅
