\set ON_ERROR_STOP 1
select qh.seed_class('6c');
create temp table ids as select
  (select user_id from qh.profiles where name='Mattia') mattia,
  (select user_id from qh.profiles where name='Brunner') teacher,
  (select s.id from qh.submissions s join qh.homeworks h on h.id=s.homework_id join qh.profiles p on p.user_id=s.student_id where p.name='Mattia' and h.subject='mathe' and s.status='offen') mathe,
  (select s.id from qh.submissions s join qh.homeworks h on h.id=s.homework_id join qh.profiles p on p.user_id=s.student_id where p.name='Mattia' and h.subject='franz') franz,
  (select s.id from qh.submissions s join qh.homeworks h on h.id=s.homework_id join qh.profiles p on p.user_id=s.student_id where p.name='Mattia' and h.subject='deutsch') deutsch;
grant select on ids to authenticated;
create function pg_temp.as_user(u uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', u::text, false) $$;
create function pg_temp.check(c boolean, msg text) returns void language plpgsql as $$ begin if not c then raise exception 'FEHLER: %', msg; end if; raise notice '✓ %', msg; end $$;
create function pg_temp.coins(n text) returns int language sql as $$ select coins from qh.profiles where name = n $$;

-- Kind: Abgeben
select pg_temp.as_user(mattia) from ids;
set role authenticated;
select public.qh_submit(mathe, '["=",">","<","<"]') from ids;
reset role;
select pg_temp.check(pg_temp.coins('Mattia') = 1050, 'Abgeben +150');
-- Kind darf nicht korrigieren
set role authenticated;
do $$ begin perform public.qh_grade((select mathe from ids), '[true,true,true,true]', ''); raise exception 'kein Fehler'; exception when others then if sqlerrm = 'kein Fehler' then raise; end if; raise notice '✓ Kind darf nicht korrigieren (%)', sqlerrm; end $$;
-- Kind sieht keine Lösungen
select pg_temp.check((select bool_and(not (t ? 'solution') and not (t ? 'sampleSolution')) from jsonb_array_elements(public.qh_get_state()->'homeworks') h, jsonb_array_elements(h->'tasks') t), 'Kind bekommt keine Lösungen');
select pg_temp.check(jsonb_array_length(public.qh_get_state()->'students') = 1, 'Kind sieht nur sich selbst');
-- Kein Direktzugriff auf Tabellen
do $$ begin perform 1 from qh.profiles; raise exception 'kein Fehler'; exception when others then if sqlerrm = 'kein Fehler' then raise; end if; raise notice '✓ Kein Direktzugriff auf Tabellen'; end $$;
reset role;
-- Lehrerin korrigiert fehlerfrei
select pg_temp.as_user(teacher) from ids;
set role authenticated;
select public.qh_grade(mathe, '[true,true,true,true]', 'Super') from ids;
reset role;
select pg_temp.check(pg_temp.coins('Mattia') = 1200, 'Fehlerfrei: insgesamt 300');
-- Nicht gemacht: 1. Mal kein Abzug, 2. Mal Abzug
update qh.profiles set coins = 100 where name = 'Mattia';
set role authenticated;
select public.qh_mark_not_done(franz) from ids;
reset role;
select pg_temp.check(pg_temp.coins('Mattia') = 100 and (select skip_next_game from qh.profiles where name='Mattia'), '1. Mal: gestrichen, kein Abzug');
insert into qh.submissions (homework_id, student_id) select h.id, (select mattia from ids) from qh.homeworks h where h.subject='englisch'
  on conflict (homework_id, student_id) do nothing;
create temp table eng as select s.id from qh.submissions s join qh.homeworks h on h.id=s.homework_id where h.subject='englisch' and s.student_id=(select mattia from ids);
grant select on eng to authenticated;
set role authenticated;
select public.qh_mark_not_done(id) from eng;
reset role;
select pg_temp.check(pg_temp.coins('Mattia') = -50 and (select locked_until_positive from qh.profiles where name='Mattia'), '2. Mal: −150 → −50 und gesperrt');
-- Kind: Sperre, Belohnung verfällt
select pg_temp.as_user(mattia) from ids;
set role authenticated;
select public.qh_submit(deutsch, '["ging","spieltest","lasen","sang"]') from ids;
reset role;
select pg_temp.check(pg_temp.coins('Mattia') = 100 and not (select locked_until_positive from qh.profiles where name='Mattia'), 'Abgeben → 100, Sperre endet automatisch');
set role authenticated;
select pg_temp.check(public.qh_claim_reward(deutsch) = 'gestrichen', 'Belohnung: gestrichen') from ids;
do $$ begin perform public.qh_start_game((select deutsch from ids), 'tor'); raise exception 'kein Fehler'; exception when others then if sqlerrm = 'kein Fehler' then raise; end if; raise notice '✓ Spiel nach Sperre nicht startbar'; end $$;
-- Shop: nie unter 0, Preise vom Server
select public.qh_shop('tuning:felgen');
do $$ begin perform public.qh_shop('car:renner'); raise exception 'kein Fehler'; exception when others then if sqlerrm = 'kein Fehler' then raise; end if; raise notice '✓ Zu wenig Spielgeld: %', sqlerrm; end $$;
do $$ begin perform public.qh_shop('car:gratis'); raise exception 'kein Fehler'; exception when others then if sqlerrm = 'kein Fehler' then raise; end if; raise notice '✓ Unbekannter Artikel abgelehnt'; end $$;
reset role;
select pg_temp.check(pg_temp.coins('Mattia') = 0, 'Felgen 100 → 0, nie negativ');
-- Lehrerin: Hausaufgabe, Schüler, Termin, Einstellungen
select pg_temp.as_user(teacher) from ids;
set role authenticated;
select public.qh_create_homework('{"subject":"mathe","title":"Neu","instruction":"x","dueWeekday":4,"important":true,"kind":"question","tasks":[{"kind":"question","question":"2 × 3","sampleSolution":"6"}]}');
select public.qh_add_student('Mia', 'Regen22');
select public.qh_update_settings('{"coinsDelta":-10}');
select public.qh_update_settings('{"maxMinutes":17}');
select public.qh_add_event('{"weekOffset":1,"weekday":2,"type":"ausflug","title":"Zoo","time":"09:00"}');
do $$ begin perform public.qh_update_settings('{"allowedGames":[]}'); raise exception 'kein Fehler'; exception when others then if sqlerrm = 'kein Fehler' then raise; end if; raise notice '✓ Mindestens ein Spiel bleibt erlaubt'; end $$;
reset role;
select pg_temp.check((select count(*) from qh.submissions s join qh.homeworks h on h.id=s.homework_id where h.title='Neu') = 6, 'Neue Hausaufgabe an 6 Kinder verteilt');
select pg_temp.check((select coins = 0 and is_new from qh.profiles where name='Mia'), 'Neues Kind mit 0 Spielgeld');
select pg_temp.check((select (settings->>'coinsPerSubmission')::int = 140 and (settings->>'maxMinutes')::int = 15 from qh.classes), '10er-Schritte, Spielzeit in 5er-Schritten');
select pg_temp.check((select encrypted_password = extensions.crypt('Regen22', encrypted_password) from auth.users where email = qh.login_email('6c','Mia')), 'Passwort gehasht gespeichert');
select pg_temp.as_user(teacher) from ids;
set role authenticated;
select pg_temp.check(jsonb_array_length(public.qh_get_state()->'students') = 6, 'Lehrerin sieht alle 6 Kinder');
select public.qh_reset_class();
reset role;
select pg_temp.check((select count(*) from qh.profiles) = 6 and pg_temp.coins('Mattia') = 900, 'Klasse zurückgesetzt');
select pg_temp.check((select user_id from qh.profiles where name = 'Brunner') = (select teacher from ids)
  and (select user_id from qh.profiles where name = 'Mattia') = (select mattia from ids), 'Zurücksetzen behält bestehende Konten');
-- Auto-Welt: Rekord nur steigend
select pg_temp.as_user(mattia) from ids;
set role authenticated;
select public.qh_save_best(120); select public.qh_save_best(80);
reset role;
select pg_temp.check((select (garage->>'best')::int from qh.profiles where name = 'Mattia') = 120, 'Rekord wird gespeichert und nie kleiner');
