# Deploy to the kickboard Railway project

Deploys must land in:

- **Project:** `kickboard` (name resolved via [`deploy/railway.project.json`](../deploy/railway.project.json))
- **Service:** `kickboard` (same file; rename in JSON if your service uses another name)
- **Environment:** **`production` only** — staging/preview/other environments are rejected

**Do not** run `railway init` or **New Project** — that creates a different project.

## Why deploys hit the wrong project

GitHub secret `RAILWAY_PROJECT_ID` may point at a **different** project than the dashboard project named kickboard. This repo now **resolves the project by name** from `deploy/railway.project.json` unless you intentionally set `RAILWAY_PROJECT_ID` to override.

If the service name in Railway is not `kickboard`, either:

- Rename the service to `kickboard` in Railway, or  
- Set GitHub variable `RAILWAY_SERVICE_NAME` to the real service name, or  
- Edit `serviceName` in `deploy/railway.project.json`.

## GitHub Actions (automated deploy)

Every push to **`main`** runs [`.github/workflows/railway-deploy.yml`](../.github/workflows/railway-deploy.yml): build, deploy to kickboard **production**, then verify `/api/health`, `/api/admin/session`, and that the homepage no longer includes `feed-status-grid`.

### One-time setup (required)

1. Railway → **kickboard** project → **Settings** → **Tokens** → create a project token.
2. GitHub → `Dorgai/kickboard` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - Name: `RAILWAY_TOKEN`
   - Value: the token from step 1
3. **Actions** → **Deploy to Railway (kickboard production)** → **Run workflow** (branch `main`).

After that, each merge to `main` deploys automatically. To push env vars from GitHub without rotating unset secrets, run the workflow manually with **Sync Railway variables** enabled (only secrets you configured in GitHub are written).

**Required secret**

| Secret | Where |
|--------|--------|
| `RAILWAY_TOKEN` | kickboard project → **Settings** → **Tokens** |

**Optional GitHub secret** (variable sync only; not required for deploy)

| Secret | Purpose |
|--------|---------|
| `JWT_SECRET` | Admin session signing (leave unset on Railway if already configured) |
| `ADMIN_DATA_SOURCES_TOKEN` | Admin data-sources gate |
| `DATABASE_URL` / `REDIS_URL` | Only if syncing from GitHub instead of Railway plugins |

**Optional GitHub variable**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Production URL for post-deploy checks (default: `https://kickboard-production.up.railway.app`) |

**If CI logs show `Unauthorized` on `railway project list`**

That is expected with a **project token** — project tokens can run `railway up` but cannot list all projects. The GitHub workflow deploys with `RAILWAY_TOKEN` only (no project list). Use a kickboard **project → Settings → Tokens** token as `RAILWAY_TOKEN`.

If deploy still fails, regenerate the token and update the GitHub secret (no extra spaces or quotes), then re-run the workflow.

**Bypass name lookup** (if the token cannot list projects but can deploy)

| Secret | Where to find it |
|--------|------------------|
| `RAILWAY_PROJECT_ID` | Railway → kickboard → **Settings** → project ID in URL or settings |
| `RAILWAY_SERVICE_ID` | kickboard service → **Settings** → service ID |

**Optional overrides** (only if lookup by name fails)

| Secret / variable | Purpose |
|------------------|---------|
| `RAILWAY_PROJECT_ID` | Force a specific project UUID |
| `RAILWAY_SERVICE_ID` | Force a specific service UUID |
| `RAILWAY_PROJECT_NAME` | Default from `deploy/railway.project.json` (`kickboard`) |
| `RAILWAY_SERVICE_NAME` | Default from `deploy/railway.project.json` (`kickboard`) |

Environment is **always `production`** — do not set `RAILWAY_ENVIRONMENT` to another value.

The workflow prints the resolved project and service IDs in the log (**Resolve kickboard Railway target**). Confirm they match the kickboard project in the Railway UI.

## Railway dashboard (GitHub source)

Inside the **kickboard** project (not another project):

1. Select the **kickboard** service (or the service name you configured above).
2. **Settings** → **Source** → `Dorgai/kickboard`, branch **`main`**, root **`/`**.
3. **Redeploy**.

Use either dashboard deploy **or** GitHub Actions CLI deploy — not two unrelated projects.

## Local CLI deploy (recommended to ship `main` now)

1. Railway → **kickboard** project (not another project) → **Settings** → **Tokens** → create a **project** token with deploy access. Account-only tokens that cannot list projects will fail with `Unauthorized` in CI.
2. From the repo root:

```bash
export RAILWAY_TOKEN="<paste token>"
npm run check          # optional: verify build locally
npm run railway:deploy # uploads repo → kickboard production, waits for /api/health
```

Target resolution uses [`deploy/railway.project.json`](../deploy/railway.project.json) (`kickboard` / `kickboard` / `production` only).

Optional overrides:

```bash
export RAILWAY_SERVICE_NAME=exact-service-name   # if service is not named kickboard
export NEXT_PUBLIC_APP_URL=https://kickboard-production.up.railway.app
export VERIFY_DEPLOY=0                           # skip post-deploy curl checks
```

### Sync variables (optional, separate from deploy)

```bash
export RAILWAY_TOKEN=...
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
