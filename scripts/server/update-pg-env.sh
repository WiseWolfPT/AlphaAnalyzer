#!/usr/bin/env bash
set -euo pipefail
FILE="/home/teste 1/.env.production"
BAK="$FILE.bak.$(date +%Y%m%d%H%M%S)"
cp "$FILE" "$BAK" || true

# Remove any existing PG lines (including malformed ones prefixed with 'n')
tmp="/tmp/envprod.$$"
grep -Ev '^(PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)=|^nPG(HOST|PORT|USER|PASSWORD|DATABASE)=' "$FILE" > "$tmp" || true
{
  echo 'PGHOST=127.0.0.1'
  echo 'PGPORT=5432'
  echo 'PGUSER=alfalyzer'
  echo 'PGPASSWORD=changeme'
  echo 'PGDATABASE=alfalyzer_db'
} >> "$tmp"
mv "$tmp" "$FILE"
chmod 600 "$FILE"
echo "Updated $FILE (backup: $BAK)"
tail -n 12 "$FILE"

