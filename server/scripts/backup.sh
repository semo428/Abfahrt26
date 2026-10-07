#!/bin/sh
# Sicherung der Abfahrt-DB nach /root/abfahrt/backups (enthält personenbezogene Daten → nach dem Event mitlöschen!)
set -eu
cd "$(dirname "$0")/../.."
umask 077
mkdir -p backups
f="backups/abfahrt-$(date +%Y-%m-%d-%H%M).dump"
docker compose exec -T db pg_dump -U abfahrt_owner -d abfahrt -Fc > "$f"
echo "Backup: $f ($(du -h "$f" | cut -f1))"
