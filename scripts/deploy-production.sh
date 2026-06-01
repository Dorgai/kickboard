#!/usr/bin/env bash
# Deploy the current repo to kickboard / production via Railway CLI.
# Requires: RAILWAY_TOKEN (kickboard project → Settings → Tokens)

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=scripts/railway-target.sh
source scripts/railway-target.sh

RAILWAY_BIN="${RAILWAY_BIN:-npx @railway/cli}"

echo "Uploading workspace to kickboard production..."
"$RAILWAY_BIN" up --detach "${RAILWAY_TARGET_ARGS[@]}"

if [ "${VERIFY_DEPLOY:-1}" = "1" ]; then
  BASE="${NEXT_PUBLIC_APP_URL:-https://kickboard-production.up.railway.app}"
  BASE="${BASE%/}"
  echo "Waiting for ${BASE}/api/health ..."
  for attempt in $(seq 1 36); do
    if curl -fsS "${BASE}/api/health" 2>/dev/null | grep -q '"ok":true'; then
      echo "Production is healthy."
      session_code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}/api/admin/session" || true)
      if [ "$session_code" = "404" ]; then
        echo "warning: ${BASE}/api/admin/session is still 404 (old build or deploy still rolling out)" >&2
      else
        echo "Admin session route responded with HTTP ${session_code} (expected not 404)."
      fi
      exit 0
    fi
    echo "Attempt ${attempt}/36 ..."
    sleep 10
  done
  echo "error: production did not become healthy within 6 minutes" >&2
  exit 1
fi

echo "Done (VERIFY_DEPLOY=0 skipped health check)."
