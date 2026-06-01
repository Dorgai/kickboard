#!/usr/bin/env bash
# Resolve Railway project/service for the kickboard project by name (from deploy/railway.project.json).
# Optional secrets RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID override lookup when set.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="${RAILWAY_CONFIG_FILE:-$ROOT_DIR/deploy/railway.project.json}"
RAILWAY_BIN="${RAILWAY_BIN:-npx @railway/cli}"

if [ -z "${RAILWAY_TOKEN:-}" ]; then
  echo "error: RAILWAY_TOKEN is not set" >&2
  exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
  echo "error: missing $CONFIG_FILE" >&2
  exit 1
fi

read_config() {
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    console.log([config.projectName, config.serviceName, config.environment || 'production'].join('\t'));
  " "$CONFIG_FILE"
}

IFS=$'\t' read -r CONFIG_PROJECT_NAME CONFIG_SERVICE_NAME CONFIG_ENVIRONMENT < <(read_config)

RAILWAY_PROJECT_NAME="${RAILWAY_PROJECT_NAME:-$CONFIG_PROJECT_NAME}"
RAILWAY_SERVICE_NAME="${RAILWAY_SERVICE_NAME:-$CONFIG_SERVICE_NAME}"

# Only the kickboard project production environment — never staging/preview/other envs.
REQUIRED_ENVIRONMENT="production"
if [ "$CONFIG_ENVIRONMENT" != "$REQUIRED_ENVIRONMENT" ]; then
  echo "error: deploy/railway.project.json environment must be \"$REQUIRED_ENVIRONMENT\" (got \"$CONFIG_ENVIRONMENT\")" >&2
  exit 1
fi
if [ -n "${RAILWAY_ENVIRONMENT:-}" ] && [ "$RAILWAY_ENVIRONMENT" != "$REQUIRED_ENVIRONMENT" ]; then
  echo "error: only Railway environment \"$REQUIRED_ENVIRONMENT\" is allowed for kickboard (RAILWAY_ENVIRONMENT=$RAILWAY_ENVIRONMENT)" >&2
  exit 1
fi
export RAILWAY_ENVIRONMENT="$REQUIRED_ENVIRONMENT"

resolve_project_id() {
  if [ -n "${RAILWAY_PROJECT_ID:-}" ]; then
    echo "$RAILWAY_PROJECT_ID"
    return
  fi

  "$RAILWAY_BIN" project list --json | node -e "
    const target = process.argv[1].toLowerCase();
    const raw = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const projects = Array.isArray(raw) ? raw : raw.projects ?? [];
    const matches = projects.filter((project) => (project.name ?? '').toLowerCase() === target);
    if (matches.length === 0) {
      console.error('No Railway project named: ' + process.argv[1]);
      console.error('Available projects:');
      for (const project of projects) {
        console.error('  - ' + project.name + ' (' + project.id + ')');
      }
      process.exit(1);
    }
    if (matches.length > 1) {
      console.error('Multiple Railway projects named \"' + process.argv[1] + '\". Set RAILWAY_PROJECT_ID to one of:');
      for (const project of matches) {
        console.error('  ' + project.id);
      }
      process.exit(1);
    }
    console.log(matches[0].id);
  " "$RAILWAY_PROJECT_NAME"
}

resolve_service_id() {
  local project_id="$1"

  if [ -n "${RAILWAY_SERVICE_ID:-}" ]; then
    echo "$RAILWAY_SERVICE_ID"
    return
  fi

  "$RAILWAY_BIN" service list --project "$project_id" --environment "$RAILWAY_ENVIRONMENT" --json | node -e "
    const target = process.argv[1].toLowerCase();
    const projectId = process.argv[2];
    const raw = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const services = (Array.isArray(raw) ? raw : raw.services ?? []).map((entry) => entry.node ?? entry);
    const matches = services.filter((service) => {
      const name = (service.name ?? '').toLowerCase();
      return name === target;
    });
    if (matches.length === 0) {
      console.error('No service named \"' + process.argv[1] + '\" in project ' + projectId);
      console.error('Services in this project/environment:');
      for (const service of services) {
        console.error('  - ' + (service.name ?? '(unnamed)') + ' (' + service.id + ')');
      }
      process.exit(1);
    }
    if (matches.length > 1) {
      console.error('Multiple services named \"' + process.argv[1] + '\". Set RAILWAY_SERVICE_ID to one of:');
      for (const service of matches) {
        console.error('  ' + service.id);
      }
      process.exit(1);
    }
    console.log(matches[0].id);
  " "$RAILWAY_SERVICE_NAME" "$project_id"
}

export RAILWAY_PROJECT_ID="$(resolve_project_id)"
export RAILWAY_SERVICE_ID="$(resolve_service_id "$RAILWAY_PROJECT_ID")"

export RAILWAY_TARGET_ARGS=(
  --project "$RAILWAY_PROJECT_ID"
  --service "$RAILWAY_SERVICE_ID"
  --environment "$RAILWAY_ENVIRONMENT"
)

echo "Railway target: kickboard project \"$RAILWAY_PROJECT_NAME\" ($RAILWAY_PROJECT_ID), service \"$RAILWAY_SERVICE_NAME\" ($RAILWAY_SERVICE_ID), environment $RAILWAY_ENVIRONMENT only"
