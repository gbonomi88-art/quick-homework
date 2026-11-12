-- Quick Homework – Klassen-Modus (Supabase)
-- Sicherheitsmodell: Alle Tabellen haben RLS ohne Policies (kein Direktzugriff).
-- Der Browser spricht nur mit SECURITY-DEFINER-Funktionen, die die Rolle prüfen
-- und die Spielgeld-Regeln (SPEC §9) serverseitig durchsetzen.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists qh;

create table if not exists qh.classes (
  id text primary key,
  name text not null,
  settings jsonb not null default '{}'::jsonb
);

create table if not exists qh.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  class_id text not null references qh.classes(id) on delete cascade,
  role text not null check (role in ('teacher','kid')),
  name text not null,
  coins int not null default 0,
  forgotten_month text,
  forgotten_count int not null default 0,
  skip_next_game boolean not null default false,
  locked_until_positive boolean not null default false,
  photo text,
  is_new boolean not null default false,
  garage jsonb,
  build_city jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_class_name on qh.profiles (class_id, lower(name));

create table if not exists qh.homeworks (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references qh.classes(id) on delete cascade,
  subject text not null check (subject in ('nmg','mathe','deutsch','franz','englisch')),
  title text not null,
  instruction text not null default '',
  due_date date not null,
  important boolean not null default false,
  kind text not null check (kind in ('compare','question','transform')),
  tasks jsonb not null,
  hausi_tip text,
  created_at timestamptz not null default now()
);

create table if not exists qh.submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references qh.homeworks(id) on delete cascade,
  student_id uuid not null references qh.profiles(user_id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  status text not null default 'offen' check (status in ('offen','abgegeben','korrigiert','nichtgemacht')),
  grading jsonb,
  comment text,
  reward int,
  base_reward int,
  seen_by_student boolean,
  reward_used boolean,
  unique (homework_id, student_id)
);

create table if not exists qh.events (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references qh.classes(id) on delete cascade,
  date date not null,
  type text not null check (type in ('test','bib','ausflug','sonst')),
  time text,
  title text not null,
  note text
);

create table if not exists qh.chats (
  student_id uuid not null references qh.profiles(user_id) on delete cascade,
  homework_id uuid not null references qh.homeworks(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  primary key (student_id, homework_id)
);

create table if not exists qh.game_sessions (
  student_id uuid primary key references qh.profiles(user_id) on delete cascade,
  submission_id uuid not null references qh.submissions(id) on delete cascade,
  game text not null,
  started_at timestamptz not null default now(),
  skipped_ms bigint not null default 0
);

alter table qh.classes enable row level security;
alter table qh.profiles enable row level security;
alter table qh.homeworks enable row level security;
alter table qh.submissions enable row level security;
alter table qh.events enable row level security;
alter table qh.chats enable row level security;
alter table qh.game_sessions enable row level security;
revoke all on all tables in schema qh from anon, authenticated;
revoke all on schema qh from anon, authenticated;

-- ---------- Hilfsfunktionen ----------
create or replace function qh.today() returns date language sql stable as $$
  select (now() at time zone 'Europe/Zurich')::date $$;
create or replace function qh.monday(d date) returns date language sql immutable as $$
  select (date_trunc('week', d))::date $$;

create or replace function qh.me() returns qh.profiles language plpgsql stable security definer set search_path = qh, public as $$
declare p qh.profiles;
begin
  select * into p from qh.profiles where user_id = auth.uid();
  if p.user_id is null then raise exception 'Nicht angemeldet' using errcode = '28000'; end if;
  return p;
end $$;

create or replace function qh.require_teacher() returns qh.profiles language plpgsql stable security definer set search_path = qh, public as $$
declare p qh.profiles := qh.me();
begin
  if p.role <> 'teacher' then raise exception 'Nur für die Lehrerin' using errcode = '42501'; end if;
  return p;
end $$;

create or replace function qh.login_email(p_class text, p_name text) returns text language sql immutable as $$
  select regexp_replace(translate(lower(trim(p_name)), 'äöüéèàâç ', 'aoueeaac-'), '[^a-z0-9-]', '', 'g') || '.' || lower(p_class) || '@schule.quickhw.app' $$;

-- Konto in auth.users anlegen (bestätigt, ohne E-Mail-Versand).
create or replace function qh.create_auth_user(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = auth, extensions, public as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true), 'email', uid::text, now(), now(), now());
  return uid;
end $$;

create or replace function qh.unlock_if_positive(p_user uuid) returns void language sql security definer set search_path = qh, public as $$
  update qh.profiles set locked_until_positive = false where user_id = p_user and coins > 0 $$;

-- Aktueller Monatszähler für „vergessen“ (setzt sich in einem neuen Monat zurück).
create or replace function qh.forgotten(p qh.profiles) returns int language sql stable as $$
  select case when p.forgotten_month = to_char(qh.today(), 'YYYY-MM') then p.forgotten_count else 0 end $$;

-- ---------- Zustand lesen ----------
create or replace function public.qh_get_state() returns jsonb language plpgsql stable security definer set search_path = qh, public as $$
declare
  p qh.profiles := qh.me();
  c qh.classes;
  mon date := qh.monday(qh.today());
  wd int := least(4, greatest(0, extract(isodow from qh.today())::int - 1));
  res jsonb;
begin
  select * into c from qh.classes where id = p.class_id;
  select jsonb_build_object(
    'calendar', jsonb_build_object('monday', mon, 'weekday', wd, 'today', qh.today()),
    'me', jsonb_build_object('id', p.user_id, 'role', p.role, 'name', p.name),
    'className', c.name,
    'settings', c.settings,
    'teacher', (select jsonb_build_object('name', t.name, 'login', t.name, 'password', '', 'photo', t.photo)
                from qh.profiles t where t.class_id = p.class_id and t.role = 'teacher' order by t.created_at limit 1),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.user_id, 'name', s.name, 'password', '', 'coins', s.coins,
        'forgottenThisMonth', qh.forgotten(s), 'skipNextGame', s.skip_next_game,
        'lockedUntilPositive', s.locked_until_positive, 'photo', s.photo, 'isNew', s.is_new) order by s.name)
      from qh.profiles s where s.class_id = p.class_id and s.role = 'kid' and (p.role = 'teacher' or s.user_id = p.user_id)), '[]'),
    'homeworks', coalesce((select jsonb_agg(jsonb_build_object(
        'id', h.id, 'subject', h.subject, 'title', h.title, 'instruction', h.instruction,
        'dueWeekday', extract(isodow from h.due_date)::int - 1,
        'dueWeekOffset', (qh.monday(h.due_date) - mon) / 7,
        'important', h.important, 'kind', h.kind, 'tasks',
          case when p.role = 'teacher' then h.tasks else (
            select jsonb_agg(t - 'solution' - 'sampleSolution') from jsonb_array_elements(h.tasks) t) end,
        'hausiTip', h.hausi_tip, 'createdBy', 'teacher') order by h.due_date)
      from qh.homeworks h where h.class_id = p.class_id and h.due_date >= mon - 7 and h.due_date < mon + 14), '[]'),
    'submissions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'homeworkId', s.homework_id, 'studentId', s.student_id, 'answers', s.answers, 'status', s.status,
        'grading', s.grading, 'comment', s.comment, 'reward', s.reward, 'baseReward', s.base_reward,
        'seenByStudent', s.seen_by_student, 'rewardUsed', s.reward_used))
      from qh.submissions s join qh.homeworks h on h.id = s.homework_id
      where h.class_id = p.class_id and h.due_date >= mon - 7 and h.due_date < mon + 14
        and (p.role = 'teacher' or s.student_id = p.user_id)), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
        'id', e.id, 'weekOffset', (qh.monday(e.date) - mon) / 7, 'weekday', extract(isodow from e.date)::int - 1,
        'type', e.type, 'time', e.time, 'title', e.title, 'note', e.note) order by e.date, e.time)
      from qh.events e where e.class_id = p.class_id and e.date >= mon - 7 and e.date < mon + 14
        and extract(isodow from e.date) <= 5), '[]'),
    'garages', case when p.role = 'kid' and p.garage is not null then jsonb_build_object(p.user_id::text, p.garage) else '{}'::jsonb end,
    'buildCity', case when p.role = 'kid' and p.build_city is not null then jsonb_build_object(p.user_id::text, p.build_city) else '{}'::jsonb end,
    'chats', coalesce((select jsonb_object_agg(ch.student_id::text || ':' || ch.homework_id::text, ch.messages)
      from qh.chats ch join qh.profiles s on s.user_id = ch.student_id
      where s.class_id = p.class_id and (ch.student_id = p.user_id or (p.role = 'teacher' and (c.settings->>'hausiTeacherCanRead')::boolean))), '{}'),
    'gameSession', (select jsonb_build_object('submissionId', g.submission_id, 'game', g.game,
        'startedAt', (extract(epoch from g.started_at) * 1000)::bigint, 'skippedMs', g.skipped_ms,
        'serverNow', (extract(epoch from now()) * 1000)::bigint)
      from qh.game_sessions g where g.student_id = p.user_id)
  ) into res;
  return res;
end $$;

-- ---------- Kind ----------
create or replace function qh.my_sub(p_sub uuid) returns qh.submissions language plpgsql stable security definer set search_path = qh, public as $$
declare s qh.submissions;
begin
  select * into s from qh.submissions where id = p_sub and student_id = auth.uid();
  if s.id is null then raise exception 'Abgabe nicht gefunden'; end if;
  return s;
end $$;

create or replace function public.qh_save_draft(p_sub uuid, p_answers jsonb) returns void language plpgsql security definer set search_path = qh, public as $$
begin
  perform qh.my_sub(p_sub);
  update qh.submissions set answers = p_answers where id = p_sub and status = 'offen';
end $$;

create or replace function public.qh_submit(p_sub uuid, p_answers jsonb) returns void language plpgsql security definer set search_path = qh, public as $$
declare s qh.submissions := qh.my_sub(p_sub); p qh.profiles := qh.me(); amount int;
begin
  if s.status <> 'offen' then raise exception 'Diese Hausaufgabe ist schon abgegeben'; end if;
  if exists (select 1 from jsonb_array_elements_text(p_answers) a where trim(a) = '')
     or jsonb_array_length(p_answers) <> (select jsonb_array_length(tasks) from qh.homeworks where id = s.homework_id) then
    raise exception 'Bitte zuerst alle Aufgaben ausfüllen';
  end if;
  select coalesce((settings->>'coinsPerSubmission')::int, 150) into amount from qh.classes where id = p.class_id;
  update qh.submissions set answers = p_answers, status = 'abgegeben', base_reward = amount, reward = amount, reward_used = false where id = p_sub;
  update qh.profiles set coins = coins + amount where user_id = p.user_id;
  perform qh.unlock_if_positive(p.user_id);
end $$;

create or replace function qh.lock_reason(p qh.profiles) returns text language sql stable as $$
  select case when p.locked_until_positive and p.coins <= 0 then 'schulden' when p.skip_next_game then 'gestrichen' else 'keine' end $$;

create or replace function public.qh_claim_reward(p_sub uuid) returns text language plpgsql security definer set search_path = qh, public as $$
declare s qh.submissions := qh.my_sub(p_sub); p qh.profiles := qh.me(); r text := qh.lock_reason(p);
begin
  if r <> 'keine' and not coalesce(s.reward_used, false) then
    update qh.submissions set reward_used = true where id = p_sub;
    update qh.profiles set skip_next_game = false where user_id = p.user_id;
  end if;
  return r;
end $$;

create or replace function public.qh_start_game(p_sub uuid, p_game text) returns void language plpgsql security definer set search_path = qh, public as $$
declare s qh.submissions := qh.my_sub(p_sub); p qh.profiles := qh.me(); c qh.classes;
begin
  select * into c from qh.classes where id = p.class_id;
  if s.status not in ('abgegeben','korrigiert') then raise exception 'Zuerst die Hausaufgabe abgeben'; end if;
  if coalesce(s.reward_used, false) then raise exception 'Für diese Abgabe wurde schon gespielt'; end if;
  if qh.lock_reason(p) <> 'keine' then raise exception 'Spielen ist gesperrt'; end if;
  if not (c.settings->'allowedGames') ? p_game then raise exception 'Dieses Spiel ist nicht erlaubt'; end if;
  update qh.submissions set reward_used = true where id = p_sub;
  insert into qh.game_sessions (student_id, submission_id, game, started_at, skipped_ms) values (p.user_id, p_sub, p_game, now(), 0)
  on conflict (student_id) do update set submission_id = excluded.submission_id, game = excluded.game, started_at = now(), skipped_ms = 0;
end $$;

create or replace function public.qh_end_game() returns void language sql security definer set search_path = qh, public as $$
  delete from qh.game_sessions where student_id = auth.uid() $$;

-- Nur Showcase: Zeit vorspulen (bleibt sichtbar markiert in der App).
create or replace function public.qh_skip_time(p_ms bigint) returns void language sql security definer set search_path = qh, public as $$
  update qh.game_sessions set skipped_ms = skipped_ms + greatest(0, p_ms) where student_id = auth.uid() $$;

create or replace function public.qh_mark_seen(p_sub uuid) returns void language plpgsql security definer set search_path = qh, public as $$
begin perform qh.my_sub(p_sub); update qh.submissions set seen_by_student = true where id = p_sub; end $$;

create or replace function public.qh_chat_append(p_homework uuid, p_messages jsonb) returns void language plpgsql security definer set search_path = qh, public as $$
declare p qh.profiles := qh.me();
begin
  if not exists (select 1 from qh.submissions where homework_id = p_homework and student_id = p.user_id) then raise exception 'Hausaufgabe nicht gefunden'; end if;
  insert into qh.chats (student_id, homework_id, messages) values (p.user_id, p_homework, p_messages)
  on conflict (student_id, homework_id) do update set messages = qh.chats.messages || excluded.messages;
end $$;

create or replace function public.qh_save_city(p_cells jsonb) returns void language sql security definer set search_path = qh, public as $$
  update qh.profiles set build_city = p_cells where user_id = auth.uid() and role = 'kid' and jsonb_array_length(p_cells) = 60 $$;

create or replace function public.qh_set_photo(p_photo text) returns void language plpgsql security definer set search_path = qh, public as $$
begin
  if p_photo is not null and length(p_photo) > 400000 then raise exception 'Bild ist zu gross'; end if;
  update qh.profiles set photo = p_photo where user_id = auth.uid();
end $$;

-- Auto-Welt: Meter-Rekord speichern (nur steigend).
create or replace function public.qh_save_best(p_meters int) returns void language plpgsql security definer set search_path = qh, public as $$
declare p qh.profiles := qh.me();
  g jsonb := coalesce(p.garage, '{"ownedCars":["flitzer"],"activeCar":"flitzer","color":"#E0352B","tuning":[]}'::jsonb);
begin
  if p.role <> 'kid' or p_meters < 0 or p_meters > 100000 then return; end if;
  if coalesce((g->>'best')::int, 0) < p_meters then
    update qh.profiles set garage = jsonb_set(g, '{best}', to_jsonb(p_meters)) where user_id = p.user_id;
  end if;
end $$;

-- Shop: Preise stehen auf dem Server. Kontostand nie unter 0.
create or replace function public.qh_shop(p_item text) returns void language plpgsql security definer set search_path = qh, public as $$
declare
  p qh.profiles := qh.me();
  g jsonb := coalesce(p.garage, '{"ownedCars":["flitzer"],"activeCar":"flitzer","color":"#E0352B","tuning":[]}'::jsonb);
  kind text := split_part(p_item, ':', 1); val text := split_part(p_item, ':', 2); price int;
begin
  if p.role <> 'kid' then raise exception 'Nur für Kinder'; end if;
  if kind = 'color' and val in ('#E0352B','#1F4E8C','#2F7D4F','#F2B33D','#FFFFFF') then price := 50; g := jsonb_set(g, '{color}', to_jsonb(val));
  elsif kind = 'tuning' and val in ('felgen','spoiler','turbo') then
    if g->'tuning' ? val then raise exception 'Schon eingebaut'; end if;
    price := case val when 'felgen' then 100 when 'spoiler' then 150 else 200 end; g := jsonb_set(g, '{tuning}', (g->'tuning') || to_jsonb(val));
  elsif kind = 'car' and val in ('bus','gelaende','renner') then
    if g->'ownedCars' ? val then raise exception 'Gehört dir schon'; end if;
    price := case val when 'bus' then 300 when 'gelaende' then 450 else 600 end;
    g := jsonb_set(jsonb_set(g, '{ownedCars}', (g->'ownedCars') || to_jsonb(val)), '{activeCar}', to_jsonb(val));
  elsif kind = 'drive' then
    if not g->'ownedCars' ? val then raise exception 'Dieses Auto gehört dir nicht'; end if;
    price := 0; g := jsonb_set(g, '{activeCar}', to_jsonb(val));
  else raise exception 'Unbekannter Artikel'; end if;
  if p.coins < price then raise exception 'Zu wenig Spielgeld'; end if;
  update qh.profiles set coins = coins - price, garage = g where user_id = p.user_id;
end $$;

-- ---------- Lehrerin ----------
create or replace function public.qh_grade(p_sub uuid, p_grading jsonb, p_comment text) returns void language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher(); s qh.submissions; base int; perfect boolean;
begin
  select s2.* into s from qh.submissions s2 join qh.homeworks h on h.id = s2.homework_id where s2.id = p_sub and h.class_id = t.class_id;
  if s.id is null then raise exception 'Abgabe nicht gefunden'; end if;
  if s.status <> 'abgegeben' then raise exception 'Nur abgegebene Hausaufgaben können korrigiert werden'; end if;
  base := coalesce(s.base_reward, 150);
  perfect := jsonb_array_length(p_grading) > 0 and not exists (select 1 from jsonb_array_elements(p_grading) x where x <> 'true'::jsonb);
  update qh.submissions set status = 'korrigiert', grading = p_grading, comment = nullif(trim(p_comment), ''),
    reward = base + case when perfect then base else 0 end, seen_by_student = false where id = p_sub;
  if perfect then
    update qh.profiles set coins = coins + base where user_id = s.student_id;
    perform qh.unlock_if_positive(s.student_id);
  end if;
end $$;

create or replace function public.qh_mark_not_done(p_sub uuid) returns void language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher(); s qh.submissions; k qh.profiles; amount int; cnt int; mon text := to_char(qh.today(), 'YYYY-MM');
begin
  select s2.* into s from qh.submissions s2 join qh.homeworks h on h.id = s2.homework_id where s2.id = p_sub and h.class_id = t.class_id;
  if s.id is null then raise exception 'Abgabe nicht gefunden'; end if;
  if s.status <> 'offen' then raise exception 'Nur offene Hausaufgaben können als «nicht gemacht» markiert werden'; end if;
  select coalesce((settings->>'coinsPerSubmission')::int, 150) into amount from qh.classes where id = t.class_id;
  select * into k from qh.profiles where user_id = s.student_id;
  cnt := qh.forgotten(k) + 1;
  update qh.submissions set status = 'nichtgemacht' where id = p_sub;
  update qh.profiles set forgotten_month = mon, forgotten_count = cnt, skip_next_game = true,
    coins = coins - case when cnt >= 2 then amount else 0 end where user_id = k.user_id;
  update qh.profiles set locked_until_positive = true where user_id = k.user_id and cnt >= 2 and coins <= 0;
end $$;

create or replace function public.qh_update_settings(p_patch jsonb) returns void language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher(); cur jsonb; nxt jsonb;
begin
  select settings into cur from qh.classes where id = t.class_id;
  nxt := cur;
  if p_patch ? 'coinsDelta' then
    nxt := jsonb_set(nxt, '{coinsPerSubmission}', to_jsonb(greatest(0, coalesce((cur->>'coinsPerSubmission')::int, 150) + case when (p_patch->>'coinsDelta')::int > 0 then 10 else -10 end)));
  end if;
  if p_patch ? 'maxMinutes' then
    nxt := jsonb_set(nxt, '{maxMinutes}', to_jsonb(least(30, greatest(5, round((p_patch->>'maxMinutes')::numeric / 5) * 5))::int));
  end if;
  if p_patch ? 'allowedGames' then
    if jsonb_array_length(p_patch->'allowedGames') = 0 then raise exception 'Mindestens ein Spiel muss erlaubt bleiben.'; end if;
    if exists (select 1 from jsonb_array_elements_text(p_patch->'allowedGames') g where g not in ('auto','bau','huepf','tor')) then raise exception 'Unbekanntes Spiel'; end if;
    nxt := jsonb_set(nxt, '{allowedGames}', p_patch->'allowedGames');
  end if;
  if p_patch ? 'hausiTeacherCanRead' then nxt := jsonb_set(nxt, '{hausiTeacherCanRead}', to_jsonb((p_patch->>'hausiTeacherCanRead')::boolean)); end if;
  if p_patch ? 'hausiSchoolTopicsOnly' then nxt := jsonb_set(nxt, '{hausiSchoolTopicsOnly}', to_jsonb((p_patch->>'hausiSchoolTopicsOnly')::boolean)); end if;
  if p_patch ? 'startImage' then
    if length(coalesce(p_patch->>'startImage', '')) > 600000 then raise exception 'Bild ist zu gross'; end if;
    nxt := case when p_patch->'startImage' = 'null'::jsonb then nxt - 'startImage' else jsonb_set(nxt, '{startImage}', p_patch->'startImage') end;
  end if;
  update qh.classes set settings = nxt where id = t.class_id;
end $$;

create or replace function public.qh_create_homework(p jsonb) returns uuid language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher(); wd int := (p->>'dueWeekday')::int; today_wd int := extract(isodow from qh.today())::int - 1;
  mon date := qh.monday(qh.today()); due date; hid uuid;
begin
  if coalesce(trim(p->>'title'), '') = '' then raise exception 'Bitte einen Titel eingeben.'; end if;
  if jsonb_array_length(coalesce(p->'tasks', '[]')) = 0 then raise exception 'Bitte mindestens eine Aufgabe eintragen.'; end if;
  if wd < 0 or wd > 4 then raise exception 'Ungültiger Abgabetag'; end if;
  due := mon + wd + case when wd < least(today_wd, 5) then 7 else 0 end;
  insert into qh.homeworks (class_id, subject, title, instruction, due_date, important, kind, tasks, hausi_tip)
  values (t.class_id, p->>'subject', trim(p->>'title'), coalesce(p->>'instruction', ''), due, coalesce((p->>'important')::boolean, false),
    p->>'kind', p->'tasks', nullif(trim(coalesce(p->>'hausiTip', '')), ''))
  returning id into hid;
  insert into qh.submissions (homework_id, student_id, answers)
  select hid, k.user_id, (select coalesce(jsonb_agg(''::text), '[]') from jsonb_array_elements(p->'tasks')) from qh.profiles k where k.class_id = t.class_id and k.role = 'kid';
  return hid;
end $$;

create or replace function public.qh_add_student(p_name text, p_password text) returns uuid language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher(); uid uuid; n text := trim(p_name);
begin
  if n = '' or length(coalesce(p_password, '')) < 6 then raise exception 'Bitte Name und ein Passwort mit mindestens 6 Zeichen eingeben.'; end if;
  if exists (select 1 from qh.profiles where class_id = t.class_id and lower(name) = lower(n)) then raise exception 'Diesen Namen gibt es schon in der Klasse.'; end if;
  uid := qh.create_auth_user(qh.login_email(t.class_id, n), p_password);
  insert into qh.profiles (user_id, class_id, role, name, coins, is_new) values (uid, t.class_id, 'kid', n, 0, true);
  insert into qh.submissions (homework_id, student_id, answers)
  select h.id, uid, (select coalesce(jsonb_agg(''::text), '[]') from jsonb_array_elements(h.tasks)) from qh.homeworks h
  where h.class_id = t.class_id and h.due_date >= qh.monday(qh.today());
  return uid;
end $$;

create or replace function public.qh_update_student(p_id uuid, p_name text, p_password text) returns void language plpgsql security definer set search_path = qh, auth, extensions, public as $$
declare t qh.profiles := qh.require_teacher(); k qh.profiles; n text := nullif(trim(coalesce(p_name, '')), '');
begin
  select * into k from qh.profiles where user_id = p_id and class_id = t.class_id and role = 'kid';
  if k.user_id is null then raise exception 'Kind nicht gefunden'; end if;
  if n is not null and n <> k.name then
    if exists (select 1 from qh.profiles where class_id = t.class_id and lower(name) = lower(n) and user_id <> p_id) then raise exception 'Diesen Namen gibt es schon in der Klasse.'; end if;
    update qh.profiles set name = n where user_id = p_id;
    update auth.users set email = qh.login_email(t.class_id, n), updated_at = now() where id = p_id;
    update auth.identities set identity_data = identity_data || jsonb_build_object('email', qh.login_email(t.class_id, n)) where user_id = p_id;
  end if;
  if coalesce(p_password, '') <> '' then
    if length(p_password) < 6 then raise exception 'Das Passwort braucht mindestens 6 Zeichen.'; end if;
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_id;
  end if;
end $$;

create or replace function public.qh_add_event(p jsonb) returns uuid language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher(); eid uuid; wo int := (p->>'weekOffset')::int; wd int := (p->>'weekday')::int;
begin
  if coalesce(trim(p->>'title'), '') = '' then raise exception 'Bitte einen Titel eingeben.'; end if;
  if wo not between -1 and 1 or wd not between 0 and 4 then raise exception 'Ungültiger Tag'; end if;
  insert into qh.events (class_id, date, type, time, title, note)
  values (t.class_id, qh.monday(qh.today()) + wo * 7 + wd, p->>'type', nullif(p->>'time', ''), trim(p->>'title'), nullif(trim(coalesce(p->>'note', '')), ''))
  returning id into eid;
  return eid;
end $$;

create or replace function public.qh_delete_event(p_id uuid) returns void language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher();
begin delete from qh.events where id = p_id and class_id = t.class_id; end $$;

-- Login-Hilfe: Name → interne Anmelde-Adresse (keine Daten werden preisgegeben).
create or replace function public.qh_login_email(p_class text, p_name text) returns text language sql immutable security definer set search_path = qh, public as $$
  select qh.login_email(p_class, p_name) $$;

-- ---------- Startdaten (relativ zur aktuellen Woche) ----------
create or replace function qh.seed_class(p_class text) returns void language plpgsql security definer set search_path = qh, auth, extensions, public as $$
declare mon date := qh.monday(qh.today()); kid record; uid uuid;
  kids jsonb := '[["Mattia","Sonne2026",900],["Lina","Mond2026",450],["Noah","Wolke17",400],["Elif","Blitz88",450],["Luca","Stern55",400]]';
  cfg jsonb := jsonb_build_object('coinsPerSubmission', 150, 'allowedGames', '["auto","bau","huepf","tor"]'::jsonb, 'maxMinutes', 30,
    'hausiTeacherCanRead', true, 'hausiSchoolTopicsOnly', true, 'teacherTitle', 'Frau Brunner');
begin
  -- Bestehende Konten bleiben erhalten (laufende Anmeldungen gelten weiter), nur die Daten gehen auf Anfang.
  insert into qh.classes (id, name, settings) values (p_class, upper(p_class), cfg) on conflict (id) do update set settings = cfg;
  delete from qh.homeworks where class_id = p_class;
  delete from qh.events where class_id = p_class;
  delete from qh.game_sessions where student_id in (select user_id from qh.profiles where class_id = p_class);
  delete from auth.users where id in (select user_id from qh.profiles where class_id = p_class and role = 'kid'
    and lower(name) not in (select lower(value->>0) from jsonb_array_elements(kids)));
  select user_id into uid from qh.profiles where class_id = p_class and role = 'teacher' limit 1;
  if uid is null then
    uid := qh.create_auth_user(qh.login_email(p_class, 'Brunner'), 'Tafel2026');
    insert into qh.profiles (user_id, class_id, role, name) values (uid, p_class, 'teacher', 'Brunner');
  else
    update qh.profiles set name = 'Brunner', photo = null where user_id = uid;
    update auth.users set email = qh.login_email(p_class, 'Brunner'), encrypted_password = extensions.crypt('Tafel2026', extensions.gen_salt('bf')) where id = uid;
  end if;
  for kid in select value from jsonb_array_elements(kids) loop
    select user_id into uid from qh.profiles where class_id = p_class and role = 'kid' and lower(name) = lower(kid.value->>0);
    if uid is null then
      uid := qh.create_auth_user(qh.login_email(p_class, kid.value->>0), kid.value->>1);
      insert into qh.profiles (user_id, class_id, role, name) values (uid, p_class, 'kid', kid.value->>0);
    else
      update auth.users set email = qh.login_email(p_class, kid.value->>0), encrypted_password = extensions.crypt(kid.value->>1, extensions.gen_salt('bf')) where id = uid;
    end if;
    update qh.profiles set name = kid.value->>0, coins = (kid.value->>2)::int, forgotten_month = null, forgotten_count = 0, skip_next_game = false,
      locked_until_positive = false, photo = null, is_new = false, garage = null, build_city = null where user_id = uid;
  end loop;
  insert into qh.homeworks (class_id, subject, title, instruction, due_date, important, kind, tasks, hausi_tip) values
  (p_class, 'nmg', 'Energie und Strom', 'Beantworte die Fragen in ganzen Sätzen.', mon + 1, true, 'question',
   '[{"kind":"question","question":"Nenne zwei Geräte bei dir zu Hause, die Strom brauchen."},{"kind":"question","question":"Woher kommt Strom? Nenne eine Energiequelle."},{"kind":"question","question":"Warum soll man das Licht ausschalten, wenn man das Zimmer verlässt?"},{"kind":"question","question":"Was leitet Strom besser: Holz oder Metall?","sampleSolution":"Metall"}]',
   'Denk an die Sonne, den Wind oder einen Fluss. Was davon kann man nutzen, um Strom zu machen?'),
  (p_class, 'mathe', 'Brüche und Dezimalzahlen vergleichen', 'Setze das richtige Zeichen ein: < (kleiner), > (grösser) oder = (gleich).', mon + 2, false, 'compare',
   '[{"kind":"compare","left":"1/2","right":"0,5","solution":"="},{"kind":"compare","left":"3/4","right":"0,7","solution":">"},{"kind":"compare","left":"0,25","right":"1/3","solution":"<"},{"kind":"compare","left":"2/5","right":"0,6","solution":"<"}]',
   'Mach aus dem Bruch eine Dezimalzahl. Rechne oben : unten.'),
  (p_class, 'franz', 'Vokabeln: Les animaux', 'Übersetze die Tiere ins Deutsche – mit Artikel (der, die, das).', mon + 3, false, 'question',
   '[{"kind":"question","question":"le chien","sampleSolution":"der Hund"},{"kind":"question","question":"le chat","sampleSolution":"die Katze"},{"kind":"question","question":"l’oiseau","sampleSolution":"der Vogel"},{"kind":"question","question":"le cheval","sampleSolution":"das Pferd"}]', null),
  (p_class, 'deutsch', 'Verben in der Vergangenheit', 'Schreib das Verb in der Vergangenheit (Präteritum).', mon + 4, false, 'transform',
   '[{"kind":"transform","word":"ich gehe","prefix":"ich","solution":"ging"},{"kind":"transform","word":"du spielst","prefix":"du","solution":"spieltest"},{"kind":"transform","word":"wir lesen","prefix":"wir","solution":"lasen"},{"kind":"transform","word":"er singt","prefix":"er","solution":"sang"}]', null),
  (p_class, 'englisch', 'My Day', 'Answer the questions in English. Beginne mit «I …».', mon + 4, false, 'question',
   '[{"kind":"question","question":"What time do you get up?","placeholder":"I get up at …"},{"kind":"question","question":"What do you eat for breakfast?","placeholder":"I eat …"},{"kind":"question","question":"How do you go to school?","placeholder":"I go to school by …"},{"kind":"question","question":"What do you do after school?","placeholder":"After school I …"}]', null),
  (p_class, 'mathe', 'Malrechnungen bis 100', 'Rechne aus.', mon - 5, false, 'question',
   '[{"kind":"question","question":"7 × 8","sampleSolution":"56"},{"kind":"question","question":"6 × 9","sampleSolution":"54"},{"kind":"question","question":"4 × 12","sampleSolution":"48"},{"kind":"question","question":"9 × 9","sampleSolution":"81"}]', null);
  -- offene Abgaben für alle aktuellen Hausaufgaben
  insert into qh.submissions (homework_id, student_id, answers)
  select h.id, k.user_id, '["","","",""]' from qh.homeworks h cross join qh.profiles k
  where h.class_id = p_class and k.class_id = p_class and k.role = 'kid' and h.due_date >= mon;
  -- korrigierte Mal-Hausaufgabe der letzten Woche
  insert into qh.submissions (homework_id, student_id, answers, status, grading, comment, base_reward, reward, seen_by_student, reward_used)
  select h.id, k.user_id, x.answers, 'korrigiert', x.grading, x.comment, 150, case when x.grading = '[true,true,true,true]' then 300 else 150 end, k.name <> 'Mattia', true
  from qh.homeworks h join qh.profiles k on k.class_id = p_class and k.role = 'kid'
  join (values
    ('Mattia', '["56","54","46","81"]'::jsonb, '[true,true,false,true]'::jsonb, 'Toll gemacht, Mattia! Bei 4 × 12 schau nochmal genau hin: 4 × 10 = 40 – und wie viel ist 4 × 2?'),
    ('Lina', '["56","45","48","81"]', '[true,false,true,true]', 'Gut gemacht! Schau dir 6 × 9 nochmal an.'),
    ('Noah', '["56","54","48","72"]', '[true,true,true,false]', 'Fast alles richtig – 9 × 9 nochmal üben.'),
    ('Elif', '["56","54","48","81"]', '[true,true,true,true]', 'Fehlerfrei – super!'),
    ('Luca', '["54","54","48","81"]', '[false,true,true,true]', 'Bei 7 × 8 nochmal nachrechnen.')
  ) as x(name, answers, grading, comment) on x.name = k.name
  where h.class_id = p_class and h.title = 'Malrechnungen bis 100';
  -- drei Kinder haben NMG schon abgegeben
  update qh.submissions s set status = 'abgegeben', base_reward = 150, reward = 150, reward_used = true,
    answers = '["Kühlschrank und Fernseher.","Aus der Sonne mit Solarzellen.","Damit man keinen Strom verschwendet.","Metall leitet Strom besser."]'
  from qh.homeworks h, qh.profiles k
  where s.homework_id = h.id and s.student_id = k.user_id and h.class_id = p_class and h.subject = 'nmg' and k.name in ('Lina','Noah','Elif');
  insert into qh.events (class_id, date, type, time, title, note) values
  (p_class, mon - 6, 'test', '09:00', 'Deutsch-Test: Nomen und Artikel', null),
  (p_class, mon - 4, 'bib', '10:00', 'Bibliothek', 'Neues Buch ausleihen.'),
  (p_class, mon - 3, 'sonst', '08:00', 'Sporttag', 'Turnsachen und Trinkflasche mitnehmen.'),
  (p_class, mon, 'bib', '10:00', 'Bibliothek', 'Ausgeliehene Bücher mitbringen.'),
  (p_class, mon + 2, 'test', '08:15', 'Mathe-Test: Brüche und Dezimalzahlen', 'Lernen: Seite 34–37'),
  (p_class, mon + 3, 'test', '13:30', 'Französisch: Vokabeltest', 'Les animaux'),
  (p_class, mon + 4, 'ausflug', '09:00', 'Besuch im Wasserkraftwerk', 'Znüni und gute Schuhe mitnehmen.'),
  (p_class, mon + 7, 'bib', '10:00', 'Bibliothek', 'Buch fertig lesen!'),
  (p_class, mon + 9, 'test', '10:00', 'Englisch-Test: My Day', 'Lernen: Unit 3'),
  (p_class, mon + 10, 'sonst', '19:00', 'Elternabend', 'Sag es deinen Eltern.'),
  (p_class, mon + 11, 'ausflug', '14:00', 'Theater-Besuch', 'Wir treffen uns beim Schulhaus.');
end $$;

-- Lehrerin: Klasse auf die Startdaten zurücksetzen (nur für den Showcase).
create or replace function public.qh_reset_class() returns void language plpgsql security definer set search_path = qh, public as $$
declare t qh.profiles := qh.require_teacher();
begin perform qh.seed_class(t.class_id); end $$;

-- Nur die public.qh_*-Funktionen sind für angemeldete Nutzer aufrufbar.
revoke all on all functions in schema qh from public, anon, authenticated;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'qh\_%' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
grant execute on function public.qh_login_email(text, text) to anon;
