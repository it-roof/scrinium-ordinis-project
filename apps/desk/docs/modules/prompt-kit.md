# Modul: Sachverhalt verarbeiten

> **Code-Name:** `prompt-kit` · **UI-Name:** Sachverhalt verarbeiten · **Route:** `/recht/prompt-baukasten`

Eigenständige Funktion für Anwälte: Fallschilderung eingeben und daraus einen KI-Prompt erzeugen. **Kein** Bezug zum Modul „Prompt-Bibliothek“ (gespeicherte Prompt-Texte).

## Zweck

Geführter Wizard (interaktiv, ohne Persistenz) — startet direkt bei der Sachverhalt-Eingabe:

1. **Text** — tippen und/oder diktieren; Abschnitts-Badges (Beteiligte, Ziel, …)
2. **Prüfen** — erzeugten Prompt anzeigen und bei Bedarf nachschärfen
3. **Kopieren** — fertigen Text in die Zwischenablage
4. **In KI einfügen** — „Prompt in KI einfügen“ Ja/Nein
5. **Ergebnis prüfen** — Prompt prüfen, Fehler abfragen
6. **Nächster Schritt** — Schreiben, E-Mail, Recherche-Vermerk oder Aktennotiz wählen
7. **Schreiben (Folgefluss)** — Bei „Schreiben“: Thema/Kernbotschaft eingeben → Prompt kopieren → KI erzeugt Text → Text übernehmen → Editor `/schreiben/neu`

**Diktat-Session:** Sprache und Badges bilden gemeinsam einen Entwurf. Abschnitte normal, nur Gesprochenes kursiv/ausgegraut. Mic aus = automatisch übernehmen.

Nutzt den Prompt „06 Schnelle Rechtslage“ und setzt den eingegebenen Sachverhalt ein.

**Schreiben (nach Nächster Schritt)** nutzt den Mandantenschreiben-Prompt (`PROMPT_KIT_CLIENT_LETTER`); Freitext mit Badges Thema / Kernbotschaft. Übernahme speichert den KI-Text kurz in `sessionStorage` und öffnet den Schreiben-Editor.

Rechts (Desktop): Panel „Schritte“.

## Schreibstil (UI)

Neutral, ohne Sie/Du. Titel = Handlung („Sachverhalt beschreiben“). Kurze, klare Sätze.

## Auth / Bereich

- Nur Bereich **Recht** (`legal`)
- Login erforderlich; freigeschaltetes Modul Recht

## Daten

- Keine Persistenz — Vorlagen in `lib/prompt-kit/catalog.ts`
