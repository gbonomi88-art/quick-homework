# Quick Homework

Hausaufgaben machen, abgeben – und dann gibt es eine Belohnung.
Idee & Design: Mattia (11 Jahre). Showcase-App als PWA (installierbar, offline).

**Live:** https://gbonomi88-art.github.io/quick-homework/

## Demo-Konten

| Rolle | Name | Passwort |
|---|---|---|
| Schüler/in | Mattia | `Sonne2026` |
| Schüler/in | Lina · Noah · Elif · Luca | `Mond2026` · `Wolke17` · `Blitz88` · `Stern55` |
| Lehrerin | Brunner | `Tafel2026` |

Beim Anmelden wählt man den Modus:

- **Klasse 6c (online):** echte Daten in Supabase, auf allen Geräten gleich. Was die Lehrerin am
  Laptop verteilt, sieht das Kind auf seinem Tablet (Aktualisierung alle 15 Sekunden). Echtes Datum.
  Die Lasche **«Online»** am linken Rand: «Klassendaten zurücksetzen» (Lehrerin) und «Zur Demo wechseln».
- **Demo (nur dieses Gerät):** alles lokal im Browser, Demo-Heute ist **Dienstag, 17.11.**
  Die Lasche **«Demo»** wechselt direkt die Rolle und setzt die Demo zurück.

## Auf dem Tablet installieren

- **iPad / iPhone (Safari):** Teilen → «Zum Home-Bildschirm».
- **Android / Chrome / Edge:** Knopf «App installieren» auf der Anmeldeseite.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm test         # Regeln (Spielgeld, Sperren, Timer, Hausi) mit Vitest
npm run build    # Produktions-Build inkl. Service Worker
```

Jeder Push auf `main` wird getestet und auf GitHub Pages veröffentlicht.

## Aufbau

- `src/store/` – Datenmodell, Startdaten, Regeln (`rules.ts`), Aktionen (`actions.ts`: Demo lokal / Klasse über Supabase), Hausi (`hausi.ts`) + Tests
- `src/backend/` – Supabase-Anbindung · `supabase/` – Schema, Startdaten, SQL-Tests
- `src/screens/student/`, `src/screens/teacher/` – Screens
- `src/games/` – jedes Spiel ein eigenes Modul im gemeinsamen Rahmen `GameFrame`:
  - Auto-Welt (`hill/`): Gelände-Fahrspiel mit Physik; Shop-Käufe ändern das Fahrverhalten
  - Hüpf-Held (`jump/`): endloser Springer bis ins Weltall, Sterne kaufen Figuren und Verbesserungen
  - Torschuss (`kick/`): Wisch-Elfmeter mit Levels, Mauer, Zielscheiben; Münzen kaufen Training und Bälle
  - Baumeister (`city/`): Aufbau-Stadt mit Einwohnern, Läden, Freude und Stadtstufen
  - Rekorde, Freischaltungen und Aufträge werden pro Kind gespeichert (`qh_save_progress`)
- `scripts/extract-svgs.mjs` – übernimmt Grafiken aus den Design-Dateien

Demo-Modus: Alle Daten bleiben im Browser (localStorage).
Klassen-Modus: Supabase Auth (Passwörter gehasht), Spielgeld-Regeln laufen als geprüfte
Datenbank-Funktionen – siehe [`supabase/README.md`](supabase/README.md).
