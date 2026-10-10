-- Abfahrt · alfons x — Datenbankschema (Weg C, eigene Postgres „abfahrt-db“)
-- Läuft automatisch beim ersten Start des DB-Containers (leeres Volume), als Owner-Rolle.
-- Gespeichert wird nur: Spaßname, Instagram-Handle, Challenge-Zeitstempel, Vibes, Status/Gewinn/Gewinncode.
-- Start der Live-Auslosung (reveal_at) und Gewinn-Anzahlen kommen aus der .env (REVEAL_AT, PRIZES).

create table players (
  id          uuid primary key default gen_random_uuid(),
  token_hash  bytea not null unique,                 -- sha256 des Geräte-Tokens, nie das Token selbst
  fun_name    text not null check (char_length(fun_name) between 2 and 24 and fun_name = btrim(fun_name)),
  ig_handle   text not null check (ig_handle ~ '^[a-z0-9._]{1,30}$'),
  character   jsonb,                                 -- optional (Charakter-Karte noch offen)
  photo_at    timestamptz,                           -- Challenge 1: Abfahrt-Foto
  vibe_at     timestamptz,                           -- Challenge 2: Vibe-Check
  status      text not null default 'active' check (status in ('active', 'drawn', 'won', 'rejected')),
  prize       text check (prize ~ '^[a-z]{1,20}$'),  -- Gewinn, sobald gezogen (Schlüssel aus PRIZES, z. B. meet/shirt/drink)
  win_code    text unique,
  vibe_count  int not null default 0,
  created_at  timestamptz not null default now()
);
create unique index players_fun_name_unique  on players (lower(fun_name));
create unique index players_ig_handle_unique on players (ig_handle);
create index players_eligible on players (status)
  where photo_at is not null and vibe_at is not null;
create index players_prize on players (prize) where prize is not null;

create table vibes (
  id          bigint generated always as identity primary key,
  player_id   uuid not null references players (id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  text        text not null check (char_length(text) between 2 and 80),
  created_at  timestamptz not null default now()
);
create index vibes_created on vibes (created_at desc);
create index vibes_player on vibes (player_id);

create table admins (
  id          int generated always as identity primary key,
  email       text not null unique,
  pw_hash     text not null,                         -- scrypt
  created_at  timestamptz not null default now()
);

create table admin_sessions (
  token_hash  bytea primary key,
  admin_id    int not null references admins (id) on delete cascade,
  expires_at  timestamptz not null
);
