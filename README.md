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

Die Lasche **«Demo»** am linken Rand wechselt direkt die Rolle und setzt die Demo zurück.
Demo-Heute ist **Dienstag, 17.11.**

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

- `src/store/` – Datenmodell, Startdaten, Regeln (`rules.ts`), Hausi (`hausi.ts`) + Tests
- `src/screens/student/`, `src/screens/teacher/` – Screens
- `src/games/` – jedes Spiel ein eigenes Modul im gemeinsamen Rahmen `GameFrame`
- `scripts/extract-svgs.mjs` – übernimmt Grafiken aus den Design-Dateien

Alle Daten bleiben im Browser (localStorage). Passwörter sind Demo-Werte; ein echtes
Produkt braucht Passwort-Hashing und Server-Authentifizierung (geplant: Supabase).
