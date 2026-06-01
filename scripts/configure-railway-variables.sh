#!/usr/bin/env bash
# Push recommended Kickboard variables to the linked Railway service.
# Requires: RAILWAY_TOKEN and a linked project (`railway link` or RAILWAY_SERVICE_ID).

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${RAILWAY_TOKEN:-}" ]; then
  echo "error: RAILWAY_TOKEN is not set" >&2
  exit 1
fi

RAILWAY_BIN="${RAILWAY_BIN:-npx @railway/cli}"

JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
ADMIN_DATA_SOURCES_TOKEN="${ADMIN_DATA_SOURCES_TOKEN:-$(openssl rand -hex 24)}"

set_var() {
  $RAILWAY_BIN variable set "$1" --skip-deploys
}

echo "Setting core secrets on Railway..."
set_var "JWT_SECRET=${JWT_SECRET}"
set_var "ADMIN_DATA_SOURCES_TOKEN=${ADMIN_DATA_SOURCES_TOKEN}"

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Setting DATABASE_URL..."
  set_var "DATABASE_URL=${DATABASE_URL}"
else
  echo "skip DATABASE_URL (add Railway Postgres and re-run with DATABASE_URL set)"
fi

if [ -n "${REDIS_URL:-}" ]; then
  echo "Setting REDIS_URL..."
  set_var "REDIS_URL=${REDIS_URL}"
else
  echo "skip REDIS_URL (add Railway Redis and re-run with REDIS_URL set)"
fi

if [ -n "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "Setting NEXT_PUBLIC_APP_URL..."
  set_var "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
else
  echo "skip NEXT_PUBLIC_APP_URL (set after: railway domain)"
fi

if [ -n "${API_FOOTBALL_KEY:-}" ]; then
  set_var "API_FOOTBALL_KEY=${API_FOOTBALL_KEY}"
fi

echo "Triggering redeploy so variables take effect..."
$RAILWAY_BIN up --detach || true

echo "Done. Save these locally if needed (not printed for JWT/ADMIN by default)."
echo "Admin dashboard: /admin/data-sources (use ADMIN_DATA_SOURCES_TOKEN from your shell env if you set it before this script)."
