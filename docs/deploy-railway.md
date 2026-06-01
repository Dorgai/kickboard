# Deploy to the kickboard Railway project

Deploys must land in the Railway project named **`kickboard`**, service **`kickboard`**, as defined in [`deploy/railway.project.json`](../deploy/railway.project.json).

**Do not** run `railway init` or **New Project** — that creates a different project.

## Why deploys hit the wrong project

GitHub secret `RAILWAY_PROJECT_ID` may point at a **different** project than the dashboard project named kickboard. This repo now **resolves the project by name** from `deploy/railway.project.json` unless you intentionally set `RAILWAY_PROJECT_ID` to override.

If the service name in Railway is not `kickboard`, either:

- Rename the service to `kickboard` in Railway, or  
- Set GitHub variable `RAILWAY_SERVICE_NAME` to the real service name, or  
- Edit `serviceName` in `deploy/railway.project.json`.

## GitHub Actions (CLI deploy)

**Required secret**

| Secret | Where |
|--------|--------|
| `RAILWAY_TOKEN` | kickboard project → **Settings** → **Tokens** |

**Optional overrides** (only if lookup by name fails)

| Secret / variable | Purpose |
|------------------|---------|
| `RAILWAY_PROJECT_ID` | Force a specific project UUID |
| `RAILWAY_SERVICE_ID` | Force a specific service UUID |
| `RAILWAY_PROJECT_NAME` | Default from `deploy/railway.project.json` (`kickboard`) |
| `RAILWAY_SERVICE_NAME` | Default from `deploy/railway.project.json` (`kickboard`) |
| `RAILWAY_ENVIRONMENT` | Default `production` |

The workflow prints the resolved project and service IDs in the log (**Resolve kickboard Railway target**). Confirm they match the kickboard project in the Railway UI.

## Railway dashboard (GitHub source)

Inside the **kickboard** project (not another project):

1. Select the **kickboard** service (or the service name you configured above).
2. **Settings** → **Source** → `Dorgai/kickboard`, branch **`main`**, root **`/`**.
3. **Redeploy**.

Use either dashboard deploy **or** GitHub Actions CLI deploy — not two unrelated projects.

## Local CLI

```bash
export RAILWAY_TOKEN=...
# optional overrides:
# export RAILWAY_SERVICE_NAME=exact-service-name

npm run railway:variables
```

The script lists available projects/services if the name `kickboard` is not found.

## Variables on the kickboard service

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Public URL of this service |
| `JWT_SECRET` | Random string |
| `ADMIN_DATA_SOURCES_TOKEN` | Random string |
| `DATABASE_URL` / `REDIS_URL` | From plugins in **kickboard** (optional) |

## Verify

```bash
curl -fsS https://<your-domain>/api/health
```
