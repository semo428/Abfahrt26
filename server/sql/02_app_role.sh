#!/bin/sh
# Legt die Rolle an, mit der die App sich verbindet: nur Lesen/Schreiben auf die vier Tabellen,
# kein DDL, keine anderen Datenbanken. Läuft nach 01_schema.sql beim ersten Start des DB-Containers.
set -eu
psql -v ON_ERROR_STOP=1 -v app_pw="$APP_DB_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
create role abfahrt_app login password :'app_pw';
alter role abfahrt_app set statement_timeout = '5s';
alter role abfahrt_app set idle_in_transaction_session_timeout = '10s';
revoke all on database abfahrt from public;
grant connect on database abfahrt to abfahrt_app;
revoke all on schema public from public;
grant usage on schema public to abfahrt_app;
grant select, insert, update, delete on players, vibes, admins, admin_sessions to abfahrt_app;
grant usage on all sequences in schema public to abfahrt_app;
EOSQL
