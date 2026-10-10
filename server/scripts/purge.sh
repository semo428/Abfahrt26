#!/bin/sh
# Löscht Spielerdaten in der Abfahrt-DB. Läuft nur auf dem VPS (kein öffentlicher Endpunkt).
#   purge.sh              → ALLE Spieler, Vibes und Admin-Sitzungen (nach der Verlosung)
#   purge.sh --loadtest   → nur Lasttest-Daten (Instagram-Handles mit Präfix „lt_“)
# Danach für das komplette Ende:  cd /root/abfahrt && docker compose down -v && rm -rf backups && docker image rm abfahrt-app:local
set -eu
cd "$(dirname "$0")/../.."
psql(){ docker compose exec -T db psql -U abfahrt_owner -d abfahrt -v ON_ERROR_STOP=1 -At "$@"; }

if [ "${1:-}" = "--loadtest" ]; then
  n=$(psql -c "with d as (delete from players where ig_handle like 'lt\_%' returning 1) select count(*) from d")
  echo "Lasttest-Spieler gelöscht: $n"
  exit 0
fi

echo "Aktuell: $(psql -c 'select count(*) from players') Spieler, $(psql -c 'select count(*) from vibes') Vibes."
printf 'Wirklich ALLE Spielerdaten löschen? Tippe ALLES LÖSCHEN: '
read -r answer
[ "$answer" = "ALLES LÖSCHEN" ] || { echo "Abgebrochen."; exit 1; }
psql -c "begin; delete from vibes; delete from players; delete from admin_sessions; commit;" >/dev/null
echo "Gelöscht. Spieler jetzt: $(psql -c 'select count(*) from players')"
echo "Nicht vergessen: backups/ löschen und am Ende docker compose down -v."
