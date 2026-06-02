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
  echo "Setting AUTH_URL..."
  set_var "AUTH_URL=${NEXT_PUBLIC_APP_URL}"
else
  echo "skip NEXT_PUBLIC_APP_URL / AUTH_URL"
fi

if [ -n "${API_FOOTBALL_KEY:-}" ]; then
  echo "Setting API_FOOTBALL_KEY..."
  set_var "API_FOOTBALL_KEY=${API_FOOTBALL_KEY}"
  echo "Setting KICKBOARD_WORKER_ENABLED=true (enables /api/feeds/realtime on web)..."
  set_var "KICKBOARD_WORKER_ENABLED=true"
else
  echo "skip API_FOOTBALL_KEY (live match picker stays on static schedule only)"
fi

if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
  echo "Setting GOOGLE_CLIENT_ID..."
  set_var "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"
else
  echo "skip GOOGLE_CLIENT_ID (required for fan sign-in — see docs/auth-oauth.md)"
fi

if [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then
  echo "Setting GOOGLE_CLIENT_SECRET..."
  set_var "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}"
else
  echo "skip GOOGLE_CLIENT_SECRET"
fi

if [ -n "${AUTH_SECRET:-}" ]; then
  echo "Setting AUTH_SECRET..."
  set_var "AUTH_SECRET=${AUTH_SECRET}"
fi

if [ -n "${RESEND_API_KEY:-}" ]; then
  echo "Setting RESEND_API_KEY..."
  set_var "RESEND_API_KEY=${RESEND_API_KEY}"
else
  echo "skip RESEND_API_KEY (registration invite email — see docs/registration-invitations.md)"
fi

if [ -n "${EMAIL_FROM:-}" ]; then
  echo "Setting EMAIL_FROM..."
  set_var "EMAIL_FROM=${EMAIL_FROM}"
else
  echo "skip EMAIL_FROM"
fi

if [ "${SKIP_FINAL_REDEPLOY:-}" != "1" ]; then
  echo "Redeploying kickboard service..."
  railway_cli up --detach "${RAILWAY_TARGET_ARGS[@]}"
else
  echo "skip final redeploy (SKIP_FINAL_REDEPLOY=1)"
fi

echo "Done."
