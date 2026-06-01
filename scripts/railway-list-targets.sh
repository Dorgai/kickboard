#!/usr/bin/env bash
# List Railway projects and services (debug wrong-project connection).

set -euo pipefail

RAILWAY_BIN="${RAILWAY_BIN:-npx @railway/cli}"

if [ -z "${RAILWAY_TOKEN:-}" ]; then
  echo "error: export RAILWAY_TOKEN first" >&2
  exit 1
fi

echo "Projects:"
"$RAILWAY_BIN" project list --json | node -e "
  const raw = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const projects = Array.isArray(raw) ? raw : raw.projects ?? [];
  for (const project of projects) {
    console.log('  ' + project.name + '  id=' + project.id);
  }
"

echo ""
echo "Services per project (production):"
"$RAILWAY_BIN" project list --json | node -e "
  const raw = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const projects = Array.isArray(raw) ? raw : raw.projects ?? [];
  for (const project of projects) {
    console.log('__PROJECT__' + project.id + '__' + project.name);
  }
" | while IFS= read -r line; do
  if [[ "$line" == __PROJECT__* ]]; then
    project_id="${line#__PROJECT__}"
    project_id="${project_id%%__*}"
    project_name="${line##*__}"
    echo ""
    echo "[$project_name]"
    "$RAILWAY_BIN" service list --project "$project_id" --environment production --json | node -e "
      const raw = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      const services = (Array.isArray(raw) ? raw : raw.services ?? []).map((e) => e.node ?? e);
      for (const service of services) {
        console.log('  ' + (service.name ?? '(unnamed)') + '  id=' + service.id);
      }
    " || echo "  (could not list services)"
  fi
done
