#!/usr/bin/env bash
# Push selected secrets to GitHub Actions for Dorgai/kickboard.
# Requires: gh CLI logged in with permission to manage repo secrets.

set -euo pipefail

REPO="${GITHUB_REPO:-Dorgai/kickboard}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${GITHUB_SECRETS_FILE:-$ROOT/deploy/github-secrets.env}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: install GitHub CLI (https://cli.github.com/) and run: gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: run: gh auth login" >&2
  exit 1
fi

set_secret() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "skip $name (empty)"
    return
  fi
  if echo "$value" | grep -q 'railway\.internal'; then
    echo "error: $name contains postgres.railway.internal — use Railway Postgres → Connect → Public URL" >&2
    exit 1
  fi
  echo "Setting secret $name on $REPO …"
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
}

set_var() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "skip variable $name (empty)"
    return
  fi
  echo "Setting variable $name on $REPO …"
  gh variable set "$name" --repo "$REPO" --body "$value"
}

if [ -f "$ENV_FILE" ]; then
  echo "Loading $ENV_FILE"
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

# CLI overrides / interactive env
DATABASE_URL="${DATABASE_URL:-}"
RAILWAY_TOKEN="${RAILWAY_TOKEN:-}"
RAILWAY_PROJECT_ID="${RAILWAY_PROJECT_ID:-}"
RAILWAY_SERVICE_ID="${RAILWAY_SERVICE_ID:-}"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-}"

if [ -z "$DATABASE_URL" ] && [ -z "$RAILWAY_TOKEN" ] && [ -z "$RAILWAY_PROJECT_ID" ]; then
  echo "error: nothing to set. Copy deploy/github-secrets.env.example → deploy/github-secrets.env and fill values." >&2
  exit 1
fi

set_secret DATABASE_URL "$DATABASE_URL"
set_secret RAILWAY_TOKEN "$RAILWAY_TOKEN"
set_secret RAILWAY_PROJECT_ID "$RAILWAY_PROJECT_ID"
set_secret RAILWAY_SERVICE_ID "$RAILWAY_SERVICE_ID"

if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  NEXT_PUBLIC_APP_URL="$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$ROOT/deploy/railway.project.json','utf8')).productionUrl||'')}catch(e){}" 2>/dev/null || true)"
fi
set_var NEXT_PUBLIC_APP_URL "$NEXT_PUBLIC_APP_URL"

echo ""
echo "Done. In GitHub: Settings → Secrets and variables → Actions"
echo "Then run: Actions → Apply community schema (production) → Run workflow (not Re-run)"
