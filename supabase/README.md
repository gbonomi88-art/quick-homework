# Supabase (Klassen-Modus)

1. `schema.sql` im SQL-Editor ausführen (idempotent, kann mehrfach laufen).
2. `seed.sql` ausführen: legt Klasse 6c mit Frau Brunner und 5 Kindern an.

Sicherheit: Alle Tabellen liegen im Schema `qh` mit Row Level Security und ohne Policies –
der Browser hat keinen Direktzugriff. Er ruft nur die Funktionen `public.qh_*` auf, die die
Rolle (Kind/Lehrerin) prüfen und die Spielgeld-Regeln serverseitig durchsetzen.
Kinder bekommen keine Lösungen und sehen nur ihre eigenen Daten. Passwörter werden von
Supabase Auth gehasht gespeichert.

## Lokal testen (ohne Supabase)

```bash
psql -f tests/supabase_stub.sql          # legt DB qhtest mit nachgebildetem auth-Schema an
psql -d qhtest -f schema.sql
psql -d qhtest -f tests/rules_test.sql   # Regeln als Kind und Lehrerin prüfen
```
