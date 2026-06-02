#!/usr/bin/env bash
# Push recommended Kickboard variables to the existing kickboard Railway service.
# Requires: RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID (never creates a new project).

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/railway-target.sh
source scripts/railway-target.sh

# Local runs may generate secrets; CI should only push values explicitly provided.
if [ "${ALLOW_GENERATE_SECRETS:-1}" = "1" ]; then
  JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
  ADMIN_DATA_SOURCES_TOKEN="${ADMIN_DATA_SOURCES_TOKEN:-$(openssl rand -hex 24)}"
fi

set_var() {
  railway_cli variable set "$1" --skip-deploys "${RAILWAY_TARGET_ARGS[@]}"
}

# railway-target.sh prints resolved names and IDs
if [ -n "${JWT_SECRET:-}" ]; then
  echo "Setting JWT_SECRET..."
  set_var "JWT_SECRET=${JWT_SECRET}"
else
  echo "skip JWT_SECRET (set in env or ALLOW_GENERATE_SECRETS=1 for local generate)"
fi

if [ -n "${ADMIN_DATA_SOURCES_TOKEN:-}" ]; then
  echo "Setting ADMIN_DATA_SOURCES_TOKEN..."
  set_var "ADMIN_DATA_SOURCES_TOKEN=${ADMIN_DATA_SOURCES_TOKEN}"
else
  echo "skip ADMIN_DATA_SOURCES_TOKEN"
fi

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

if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then
  NEXT_PUBLIC_APP_URL="$(node -e "
    const c = JSON.parse(require('fs').readFileSync('deploy/railway.project.json', 'utf8'));
    if (c.productionUrl) console.log(c.productionUrl);
  " 2>/dev/null || true)"
fi

if [ -n "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "Setting NEXT_PUBLIC_APP_URL..."
  set_var "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
else
  echo "skip NEXT_PUBLIC_APP_URL (set productionUrl in deploy/railway.project.json or export NEXT_PUBLIC_APP_URL)"
fi

if [ -n "${API_FOOTBALL_KEY:-}" ]; then
  set_var "API_FOOTBALL_KEY=${API_FOOTBALL_KEY}"
fi

if [ "${SKIP_FINAL_REDEPLOY:-}" != "1" ]; then
  echo "Redeploying kickboard service..."
  railway_cli up --detach "${RAILWAY_TARGET_ARGS[@]}"
else
  echo "skip final redeploy (SKIP_FINAL_REDEPLOY=1)"
fi

echo "Done."
