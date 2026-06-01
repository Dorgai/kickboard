#!/usr/bin/env bash
# Resolve Railway CLI flags so deploys always target the existing kickboard project/service.

set -euo pipefail

if [ -z "${RAILWAY_TOKEN:-}" ]; then
  echo "error: RAILWAY_TOKEN is not set" >&2
  exit 1
fi

if [ -z "${RAILWAY_PROJECT_ID:-}" ]; then
  echo "error: RAILWAY_PROJECT_ID is required (existing kickboard project — do not run railway init)" >&2
  exit 1
fi

if [ -z "${RAILWAY_SERVICE_ID:-}" ]; then
  echo "error: RAILWAY_SERVICE_ID is required (web service inside the kickboard project)" >&2
  exit 1
fi

RAILWAY_ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"

export RAILWAY_TARGET_ARGS=(
  --project "$RAILWAY_PROJECT_ID"
  --service "$RAILWAY_SERVICE_ID"
  --environment "$RAILWAY_ENVIRONMENT"
)
