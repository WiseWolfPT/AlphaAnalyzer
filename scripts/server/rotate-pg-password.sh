#!/usr/bin/env bash
set -euo pipefail

PGHOST_VAL="${PGHOST:-127.0.0.1}"
PGPORT_VAL="${PGPORT:-5432}"
PGUSER_VAL="${PGUSER:-alfalyzer}"
OLDPW_VAL="${PGPASSWORD:-changeme}"
DB_VAL="${PGDATABASE:-alfalyzer_db}"

NEWPW=$(openssl rand -base64 24 | tr -d '\n')

export PGHOST="$PGHOST_VAL" PGPORT="$PGPORT_VAL" PGUSER="$PGUSER_VAL" PGPASSWORD="$OLDPW_VAL" PGDATABASE="$DB_VAL" NEWPW

cd "/home/teste 1"
node - <<'NODE'
(async()=>{
  const { Client } = require('pg');
  const cfg = {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT||'5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    application_name: 'alfalyzer-pw-rotate'
  };
  const c = new Client(cfg);
  await c.connect();
  const pw = String(process.env.NEWPW||'').replace(/'/g, "''");
  await c.query("ALTER ROLE " + process.env.PGUSER + " WITH PASSWORD '"+pw+"'");
  await c.end();
})().catch(e=>{ console.error('PG_ERR', e.message); process.exit(2); });
NODE

# Update .env.production safely (works with any characters)
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
echo "✅ Password rotated and .env.production updated"
