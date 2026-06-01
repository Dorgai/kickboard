#!/usr/bin/env bash
# Push recommended Kickboard variables to the existing kickboard Railway service.
# Requires: RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID (never creates a new project).

set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=scripts/railway-target.sh
source scripts/railway-target.sh

RAILWAY_BIN="${RAILWAY_BIN:-npx @railway/cli}"

JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
ADMIN_DATA_SOURCES_TOKEN="${ADMIN_DATA_SOURCES_TOKEN:-$(openssl rand -hex 24)}"

set_var() {
  $RAILWAY_BIN variable set "$1" --skip-deploys "${RAILWAY_TARGET_ARGS[@]}"
}

echo "Targeting kickboard project ${RAILWAY_PROJECT_ID}, service ${RAILWAY_SERVICE_ID}..."
echo "Setting core secrets on Railway..."
set_var "JWT_SECRET=${JWT_SECRET}"
set_var "ADMIN_DATA_SOURCES_TOKEN=${ADMIN_DATA_SOURCES_TOKEN}"

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Setting DATABASE_URL..."
  set_var "DATABASE_URL=${DATABASE_URL}"
else
  echo "skip DATABASE_URL (add Railway Postgres in the kickboard project and re-run)"
fi

if [ -n "${REDIS_URL:-}" ]; then
  echo "Setting REDIS_URL..."
  set_var "REDIS_URL=${REDIS_URL}"
else
  echo "skip REDIS_URL (add Railway Redis in the kickboard project and re-run)"
fi

if [ -n "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "Setting NEXT_PUBLIC_APP_URL..."
  set_var "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
else
  echo "skip NEXT_PUBLIC_APP_URL (set after you generate a domain on this service)"
fi

if [ -n "${API_FOOTBALL_KEY:-}" ]; then
  set_var "API_FOOTBALL_KEY=${API_FOOTBALL_KEY}"
fi

echo "Redeploying kickboard service..."
$RAILWAY_BIN up --detach "${RAILWAY_TARGET_ARGS[@]}"

echo "Done."
