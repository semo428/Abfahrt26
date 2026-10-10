#!/bin/sh
# Erzeugt /root/abfahrt/.env mit zufälligen Secrets – ohne sie auszugeben.
# Aufruf auf dem VPS:  sh /root/abfahrt/server/scripts/gen-env.sh admin1@example.de admin2@example.de
# Passwörter danach selbst auslesen: grep -E 'ADMIN_._PASSWORD|BASIC_AUTH_(USER|PASSWORD)' /root/abfahrt/.env
set -eu
cd "$(dirname "$0")/../.."
[ $# -ge 1 ] || { echo "Aufruf: $0 <admin1-email> [admin2-email]" >&2; exit 1; }
[ ! -e .env ] || { echo ".env existiert schon – nichts geändert." >&2; exit 1; }

rand(){ openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-"$1"; }
BA_PW=$(rand 24)
if command -v htpasswd >/dev/null 2>&1; then BA_HASH=$(htpasswd -nbB team "$BA_PW"); else BA_HASH="team:$(openssl passwd -apr1 "$BA_PW")"; fi

umask 077
cat > .env <<EOF
ABFAHRT_HOST=abfahrt.askconnect.de
DB_OWNER_PASSWORD=$(rand 32)
APP_DB_PASSWORD=$(rand 32)
ADMIN_1_EMAIL=$1
ADMIN_1_PASSWORD=$(rand 20)
ADMIN_2_EMAIL=${2:-}
ADMIN_2_PASSWORD=$( [ -n "${2:-}" ] && rand 20 || true )
ADMIN_BASIC_AUTH='$BA_HASH'
BASIC_AUTH_USER=team
BASIC_AUTH_PASSWORD=$BA_PW
PRIZES=meet:5,shirt:3,drink:5
REVEAL_AT=2026-10-25T04:00:00+01:00
EOF
echo ".env geschrieben ($(wc -l < .env) Zeilen, Rechte 600). Secrets wurden nicht ausgegeben."
