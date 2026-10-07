#!/bin/sh
# Überträgt Webapp + Server vom Mac nach vps:/root/abfahrt (kein GitHub-Zugang auf dem Server nötig).
# .env und backups/ auf dem Server werden nie überschrieben oder gelöscht.
set -eu
cd "$(dirname "$0")/../.."
rsync -rlptv --delete \
  --exclude node_modules --exclude .DS_Store --exclude 'app/supabase' --exclude 'server/deploy' \
  --filter='protect .env' --filter='protect backups/' \
  app server vps:/root/abfahrt/
rsync -rlptv server/deploy/docker-compose.yml server/deploy/docker-compose.test.yml server/deploy/.dockerignore vps:/root/abfahrt/
