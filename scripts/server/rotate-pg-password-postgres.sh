#!/usr/bin/env bash
set -euo pipefail

NEWPW=$(openssl rand -base64 24 | tr -d '\n')

# Rotate using postgres superuser
su - postgres -c "psql -v ON_ERROR_STOP=1 -c \"ALTER USER alfalyzer WITH PASSWORD '$NEWPW';\"" >/dev/null

# Update .env.production safely
ENV_FILE="/home/teste 1/.env.production"
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)" || true
tmp="/tmp/envprod.$$"
awk -v v="$NEWPW" '
  BEGIN{done=0}
  /^PGPASSWORD=/ { print "PGPASSWORD=" v; done=1; next }
  { print }
  END{ if(!done) print "PGPASSWORD=" v }
' "$ENV_FILE" > "$tmp"
mv "$tmp" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "✅ Password rotated with postgres and .env updated"

