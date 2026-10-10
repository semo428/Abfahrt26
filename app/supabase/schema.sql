-- Abfahrt · alfons x — Datenbank (Supabase, Region Frankfurt)
-- Im Supabase-Dashboard unter "SQL Editor" komplett ausführen.
-- Vorher: Authentication → Sign In / Providers → "Allow anonymous sign-ins" aktivieren.

-- ---------- Tabellen ----------
create table if not exists public.players (
  id          uuid primary key references auth.users(id) on delete cascade,
  fun_name    text not null check (char_length(trim(fun_name)) between 2 and 24),
  ig_handle   text not null check (ig_handle ~ '^[a-z0-9._]{1,30}$'),
  character   jsonb,
  photo_at    timestamptz,
  vibe_at     timestamptz,
  status      text not null default 'active' check (status in ('active','drawn','won','rejected')),
  prize       text check (prize in ('meet','shirt','drink')),   -- Gewinn, sobald gezogen (siehe config.js prizes)
  win_code    text,
  created_at  timestamptz not null default now()
);
create unique index if not exists fun_name_unique  on public.players (lower(fun_name));
create unique index if not exists ig_handle_unique on public.players (ig_handle);

create table if not exists public.vibes (
  id         bigint generated always as identity primary key,
  player_id  uuid not null references public.players(id) on delete cascade,
  stars      int  not null check (stars between 1 and 5),
  text       text not null check (char_length(text) between 2 and 80),
  created_at timestamptz not null default now()
);

-- Zeitpunkt der Live-Auslosung. Vorher gibt der Server keine Gewinner heraus.
-- Achtung: In der Nacht 24./25.10.2026 endet die Sommerzeit (03:00 -> 02:00) – 04:00 Uhr ist dann MEZ (+01).
create table if not exists public.settings (
  id        int primary key default 1 check (id = 1),
  reveal_at timestamptz not null
);
insert into public.settings (id, reveal_at) values (1, '2026-10-25 04:00:00+01') on conflict (id) do nothing;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- Zugriffsregeln (RLS) ----------
alter table public.players enable row level security;
alter table public.vibes   enable row level security;
alter table public.admins  enable row level security;
alter table public.settings enable row level security;

-- Kein direktes Lesen der Tabelle (sonst sähe ein Gewinner seinen Status vor der Live-Auslosung).
-- Eigene Daten gibt es nur über my_player().
drop policy if exists players_select_own on public.players;

-- Anmelden: nur den eigenen Eintrag, nur im Startzustand (keine geschenkten Häkchen)
drop policy if exists players_insert_own on public.players;
create policy players_insert_own on public.players for insert to authenticated
  with check (id = auth.uid() and status = 'active' and win_code is null
              and photo_at is null and vibe_at is null and prize is null);
-- Kein UPDATE/DELETE für Spieler – Änderungen nur über die Funktionen unten.
-- vibes/admins: keine Policies → nur über Funktionen erreichbar.

-- ---------- Hilfsfunktionen ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.revealed() returns boolean
language sql stable security definer set search_path = public as $$
  select now() >= (select reveal_at from public.settings where id = 1);
$$;

-- Eigener Eintrag; Status/Gewinn/Code erst ab reveal_at (vorher sieht jeder "active")
create or replace function public.my_player() returns json
language sql stable security definer set search_path = public as $$
  select case when p.id is null then null else json_build_object(
    'id', p.id, 'fun_name', p.fun_name, 'ig_handle', p.ig_handle, 'character', p.character,
    'photo_at', p.photo_at, 'vibe_at', p.vibe_at, 'created_at', p.created_at,
    'status',   case when public.revealed() then p.status else 'active' end,
    'prize',    case when public.revealed() then p.prize end,
    'win_code', case when public.revealed() then p.win_code end) end
  from (select 1) d left join public.players p on p.id = auth.uid();
$$;

-- Foto-Challenge abhaken (key 'photo'). Vibe läuft über submit_vibe.
create or replace function public.complete_challenge(p_key text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_key <> 'photo' then raise exception 'invalid_key'; end if;
  update public.players set photo_at = coalesce(photo_at, now()) where id = auth.uid();
  if not found then raise exception 'not_registered'; end if;
  return public.my_player();
end $$;

-- Vibe abschicken (mit einfachem Wortfilter)
create or replace function public.submit_vibe(p_stars int, p_text text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.players where id = auth.uid()) then raise exception 'not_registered'; end if;
  if p_text ~* '(hurensohn|wichser|fotze|schlampe|nutte|missgeburt|spast|behindert|neger|kanake|schwuchtel|fick\s*dich|nazi|heil\s*hitler)' then
    raise exception 'blocked_text';
  end if;
  insert into public.vibes (player_id, stars, text) values (auth.uid(), p_stars, trim(p_text));
  update public.players set vibe_at = coalesce(vibe_at, now()) where id = auth.uid();
end $$;

-- Öffentliche Zahlen für Zähler + Live-Stimmung (keine Instagram-Namen!)
create or replace function public.public_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'players',    (select count(*) from public.players),
    'vibe_avg',   (select round(avg(stars)::numeric, 2) from public.vibes),
    'vibe_count', (select count(*) from public.vibes),
    'recent',     coalesce((select json_agg(x) from (
                     select p.fun_name, v.stars, v.text
                     from public.vibes v join public.players p on p.id = v.player_id
                     order by v.created_at desc limit 3) x), '[]'::json),
    'sample',     coalesce((select json_agg(y) from (
                     select p.fun_name, v.stars, v.text
                     from public.vibes v join public.players p on p.id = v.player_id
                     order by random() limit 7) y), '[]'::json)
  );
$$;

-- Live-Auslosung: Startzeit, Serverzeit (zum Uhr-Abgleich), Spaßnamen zum Durchwürfeln,
-- Gewinner (nur Spaßname + Gewinn) erst ab reveal_at – vorher null.
create or replace function public.public_reveal() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'reveal_at', (select reveal_at from public.settings where id = 1),
    'now',       now(),
    'names',     coalesce((select json_agg(fun_name) from (
                   select fun_name from public.players where photo_at is not null and vibe_at is not null
                   order by random() limit 80) n), '[]'::json),
    'winners',   case when public.revealed() then coalesce((select json_agg(json_build_object('fun_name', fun_name, 'prize', prize))
                   from public.players where status in ('drawn','won') and prize is not null), '[]'::json) end
  );
$$;

-- Eigene Daten komplett löschen (Spieler + Vibes + anonymes Konto). Nach der Ziehung gesperrt.
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if public.revealed() and exists (select 1 from public.players where id = auth.uid() and status in ('drawn','won')) then
    raise exception 'locked_after_draw';
  end if;
  delete from public.players where id = auth.uid();          -- vibes löschen sich per cascade mit
  delete from auth.users where id = auth.uid() and is_anonymous;
end $$;

-- ---------- Admin ----------
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return json_build_object(
    'total',    (select count(*) from public.players),
    'eligible', (select count(*) from public.players where status = 'active' and photo_at is not null and vibe_at is not null),
    'photo',    (select count(*) from public.players where photo_at is not null),
    'vibe',     (select count(*) from public.players where vibe_at is not null),
    -- alle Gezogenen: checked=false -> Story noch prüfen
    'winners',  coalesce((select json_agg(json_build_object('id', id, 'fun_name', fun_name, 'ig_handle', ig_handle, 'prize', prize,
                  'win_code', win_code, 'checked', status = 'won') order by prize) from public.players where status in ('drawn','won')), '[]'::json)
  );
end $$;

-- Hilfsfunktion: einen Gewinner für p_prize ziehen
create or replace function public.draw_one(p_prize text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from public.players
    where status = 'active' and photo_at is not null and vibe_at is not null
    order by random() limit 1 for update skip locked;
  if v is not null then
    update public.players set status = 'drawn', prize = p_prize,
      win_code = 'AB-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)) where id = v;
  end if;
  return v;
end $$;

-- Alle freien Gewinnplätze füllen (Anzahlen wie in config.js prizes)
create or replace function public.admin_draw_all() returns json
language plpgsql security definer set search_path = public as $$
declare pr record; have int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if not exists (select 1 from public.players where status = 'active' and photo_at is not null and vibe_at is not null) then
    raise exception 'empty_pot';
  end if;
  for pr in select * from (values ('meet', 5), ('shirt', 3), ('drink', 5)) as t(k, n) loop
    select count(*) into have from public.players where prize = pr.k and status in ('drawn','won');
    for i in 1 .. greatest(pr.n - have, 0) loop
      exit when public.draw_one(pr.k) is null;
    end loop;
  end loop;
  return public.admin_overview();
end $$;

-- Story gefunden
create or replace function public.admin_confirm(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.players set status = 'won' where id = p_id and status = 'drawn';
end $$;

-- Keine Story -> raus, für denselben Gewinn sofort neu ziehen
create or replace function public.admin_reject(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select prize into k from public.players where id = p_id and status in ('drawn','won') for update;
  update public.players set status = 'rejected', prize = null, win_code = null where id = p_id and status in ('drawn','won');
  if k is not null then perform public.draw_one(k); end if;
end $$;

-- ---------- Rechte ----------
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
drop function if exists public.admin_draw();
revoke all on function public.draw_one(text) from public, anon, authenticated;
revoke all on function public.complete_challenge(text), public.submit_vibe(int, text), public.public_stats(), public.public_reveal(),
  public.my_player(), public.revealed(), public.is_admin(), public.admin_overview(), public.admin_draw_all(),
  public.admin_confirm(uuid), public.admin_reject(uuid) from public, anon;
grant execute on function public.complete_challenge(text), public.submit_vibe(int, text), public.public_stats(), public.public_reveal(),
  public.my_player(), public.revealed(), public.is_admin(), public.admin_overview(), public.admin_draw_all(),
  public.admin_confirm(uuid), public.admin_reject(uuid) to authenticated;

-- ---------- Team-Admin anlegen ----------
-- 1) Authentication → Users → "Add user" (E-Mail + Passwort) fürs Team
-- 2) Dann hier die ID eintragen und ausführen:
-- insert into public.admins (user_id) values ('<USER-ID-AUS-AUTH>');

-- ---------- Nach dem Event: alles löschen ----------
-- delete from public.vibes; delete from public.players;
-- delete from auth.users where is_anonymous;
