#!/usr/bin/env bash
# Link this repo to kickboard / production on Railway (non-interactive when RAILWAY_TOKEN is set).
# Requires: RAILWAY_TOKEN (kickboard project → Settings → Tokens)
# Optional: RAILWAY_PROJECT_ID + RAILWAY_SERVICE_ID if the token cannot list projects.

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=scripts/railway-target.sh
source scripts/railway-target.sh

echo "Linking workspace to Railway (production only)…"
railway_cli link \
  --project "$RAILWAY_PROJECT_ID" \
  --service "$RAILWAY_SERVICE_ID" \
  --environment "$RAILWAY_ENVIRONMENT"

echo ""
echo "Whoami:"
railway_cli whoami

echo ""
echo "Connected. Useful commands:"
echo "  npm run railway:list          # projects and services (account token)"
echo "  railway run npm run db:schema # apply community tables on production Postgres"
echo "  npm run railway:deploy        # deploy current tree to kickboard production"

if [ "${RAILWAY_CONNECT_APPLY_SCHEMA:-0}" = "1" ]; then
  echo ""
  echo "RAILWAY_CONNECT_APPLY_SCHEMA=1 — applying db:schema via railway run…"
  railway_cli run npm run db:schema
fi
