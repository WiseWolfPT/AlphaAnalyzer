#!/usr/bin/env bash

set -euo pipefail

SERVER_IP="128.140.45.28"
SERVER_PATH="/home/teste 1"
REF="${1:-HEAD~1}"

echo "🔁 Rolling back on ${SERVER_IP} to ref: ${REF}"

ssh root@"${SERVER_IP}" bash -lc "'
  set -euo pipefail
  cd "'"'"${SERVER_PATH}"'"'" || exit 1
  echo "📍 Path: $(pwd)"
  echo "🔎 Verifying git repo..."
  git rev-parse --is-inside-work-tree >/dev/null
  echo "⬇️  Fetching refs..."
  git fetch --all --tags --prune
  echo "🆔 Target ref: ${REF} -> $(git rev-parse --short ${REF})"
  echo "💾 Creating safety backup archive..."
  tar -czf "backup-rollback-$(date +%Y%m%d-%H%M%S).tar.gz" dist/ || true
  echo "↩️  Resetting to ${REF}..."
  git reset --hard "${REF}"
  echo "📦 Installing production deps..."
  npm ci --production
  echo "🔨 Building app..."
  npm run build || true
  echo "🚀 Restarting PM2..."
  pm2 restart alfalyzer || pm2 start ecosystem.config.cjs --env production
  pm2 restart price-worker || true
  pm2 restart transcripts-worker || true
  pm2 save || true
  echo "✅ Rollback complete"
'"

