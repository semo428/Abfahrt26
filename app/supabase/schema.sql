-- Abfahrt · alfons x — Datenbank (Supabase, Region Frankfurt)
-- Im Supabase-Dashboard unter "SQL Editor" komplett ausführen.
-- Vorher: Authentication → Sign In / Providers → "Allow anonymous sign-ins" aktivieren.

-- ---------- Tabellen ----------
create table if not exists public.players (
  id          uuid primary key references auth.users(id) on delete cascade,
  fun_name    text not null check (char_length(trim(fun_name)) between 2 and 24),
  ig_handle   text not null check (ig_handle ~ '^[a-z0-9._]{1,30}$'),
  character   jsonb,
  random_at   timestamptz,
  vibe_at     timestamptz,
  pose_at     timestamptz,
  status      text not null default 'active' check (status in ('active','drawn','won','rejected')),
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

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- Zugriffsregeln (RLS) ----------
alter table public.players enable row level security;
alter table public.vibes   enable row level security;
alter table public.admins  enable row level security;

-- Jeder sieht nur seinen eigenen Eintrag
drop policy if exists players_select_own on public.players;
create policy players_select_own on public.players for select to authenticated
  using (id = auth.uid());

-- Anmelden: nur den eigenen Eintrag, nur im Startzustand (keine geschenkten Häkchen)
drop policy if exists players_insert_own on public.players;
create policy players_insert_own on public.players for insert to authenticated
  with check (id = auth.uid() and status = 'active' and win_code is null
              and random_at is null and vibe_at is null and pose_at is null);
-- Kein UPDATE/DELETE für Spieler – Änderungen nur über die Funktionen unten.
-- vibes/admins: keine Policies → nur über Funktionen erreichbar.

-- ---------- Hilfsfunktionen ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Challenge abhaken (random / pose). Vibe läuft über submit_vibe.
create or replace function public.complete_challenge(p_key text) returns public.players
language plpgsql security definer set search_path = public as $$
declare r public.players;
begin
  if p_key not in ('random','pose') then raise exception 'invalid_key'; end if;
  update public.players set
    random_at = case when p_key = 'random' then coalesce(random_at, now()) else random_at end,
    pose_at   = case when p_key = 'pose'   then coalesce(pose_at,   now()) else pose_at   end
  where id = auth.uid()
  returning * into r;
  if r.id is null then raise exception 'not_registered'; end if;
  return r;
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
                     order by v.created_at desc limit 3) x), '[]'::json)
  );
$$;

-- ---------- Admin ----------
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return json_build_object(
    'total',    (select count(*) from public.players),
    'eligible', (select count(*) from public.players where status = 'active' and random_at is not null and vibe_at is not null and pose_at is not null),
    'random',   (select count(*) from public.players where random_at is not null),
    'vibe',     (select count(*) from public.players where vibe_at is not null),
    'pose',     (select count(*) from public.players where pose_at is not null),
    'winners',  coalesce((select json_agg(json_build_object('fun_name', fun_name, 'ig_handle', ig_handle, 'win_code', win_code)) from public.players where status = 'won'), '[]'::json),
    'drawn',    coalesce((select json_agg(json_build_object('id', id, 'fun_name', fun_name, 'ig_handle', ig_handle)) from public.players where status = 'drawn'), '[]'::json)
  );
end $$;

create or replace function public.admin_draw() returns json
language plpgsql security definer set search_path = public as $$
declare r public.players;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into r from public.players
    where status = 'active' and random_at is not null and vibe_at is not null and pose_at is not null
    order by random() limit 1
    for update skip locked;
  if r.id is null then raise exception 'empty_pot'; end if;
  update public.players set status = 'drawn' where id = r.id;
  return json_build_object('id', r.id, 'fun_name', r.fun_name, 'ig_handle', r.ig_handle);
end $$;

create or replace function public.admin_confirm(p_id uuid) returns json
language plpgsql security definer set search_path = public as $$
declare c text := 'AB-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.players set status = 'won', win_code = c where id = p_id and status = 'drawn';
  return json_build_object('win_code', c);
end $$;

create or replace function public.admin_reject(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.players set status = 'rejected' where id = p_id and status = 'drawn';
end $$;

-- ---------- Rechte ----------
revoke all on function public.complete_challenge(text), public.submit_vibe(int, text), public.public_stats(),
  public.is_admin(), public.admin_overview(), public.admin_draw(), public.admin_confirm(uuid), public.admin_reject(uuid) from public, anon;
grant execute on function public.complete_challenge(text), public.submit_vibe(int, text), public.public_stats(),
  public.is_admin(), public.admin_overview(), public.admin_draw(), public.admin_confirm(uuid), public.admin_reject(uuid) to authenticated;

-- ---------- Team-Admin anlegen ----------
-- 1) Authentication → Users → "Add user" (E-Mail + Passwort) fürs Team
-- 2) Dann hier die ID eintragen und ausführen:
-- insert into public.admins (user_id) values ('<USER-ID-AUS-AUTH>');

-- ---------- Nach dem Event: alles löschen ----------
-- delete from public.vibes; delete from public.players;
-- delete from auth.users where is_anonymous;
