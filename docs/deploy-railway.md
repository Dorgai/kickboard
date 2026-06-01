# Deploy Kickboard to Railway

## Not seeing a deploy in the kickboard project?

Use this checklist:

1. **Service is linked to GitHub** — In the kickboard project, the web service must be **Deploy from GitHub repo** → `Dorgai/kickboard`, not an empty service with no repo.
2. **Branch is `main`** — Settings → Source → Branch **`main`** (older setups may still point at an empty initial commit).
3. **Root directory** — `/` (repository root, where `package.json` and `railway.json` live).
4. **Redeploy** — Deployments → **Deploy** / **Redeploy** on the latest `main` commit (message should **not** be only "Initial commit").
5. **Build logs** — Open the failed deployment; common fixes: Node 22 (see `nixpacks.toml`), health check `/api/health`.
6. **GitHub Actions (optional)** — Workflow `.github/workflows/railway-deploy.yml` only runs on **`main`** and needs repo secret **`RAILWAY_TOKEN`** (optional **`RAILWAY_SERVICE_ID`**). Without the token, use Railway’s native GitHub deploy (step 1).

## Option A: GitHub deploy (recommended)

1. Open [Railway](https://railway.com) and create a **New Project**.
2. Choose **Deploy from GitHub repo** and select `Dorgai/kickboard`.
3. Set the service branch to **`main`** (contains the Next.js app and `railway.json`).
4. Railway reads `railway.json`:
   - **Build:** `npm run build` (Nixpacks)
   - **Start:** `npm run start -- --hostname 0.0.0.0 --port $PORT`
   - **Health check:** `/api/health`
5. Add variables (pick one approach):

   **Dashboard:** service → **Variables** → add:

   | Variable | Example / notes |
   |----------|-----------------|
   | `NEXT_PUBLIC_APP_URL` | `https://<your-service>.up.railway.app` |
   | `ADMIN_DATA_SOURCES_TOKEN` | Strong random string for `/admin/data-sources` |
   | `JWT_SECRET` | Strong random string |
   | `DATABASE_URL` | From Railway Postgres plugin (optional for feed browser MVP) |
   | `REDIS_URL` | From Railway Redis plugin (optional until worker is used) |

   **CLI (repo script):** after `railway link` and `export RAILWAY_TOKEN=...`:

   ```bash
   chmod +x scripts/configure-railway-variables.sh
   cp deploy/railway-variables.env.example deploy/railway-variables.env
   # edit deploy/railway-variables.env (at least NEXT_PUBLIC_APP_URL after first domain)
   set -a && source deploy/railway-variables.env && set +a
   ./scripts/configure-railway-variables.sh
   ```

   **GitHub Actions:** add repository secrets `RAILWAY_TOKEN` (required for CLI deploy), optional `RAILWAY_SERVICE_ID`, `JWT_SECRET`, `ADMIN_DATA_SOURCES_TOKEN`, `DATABASE_URL`, `REDIS_URL`, and variable `NEXT_PUBLIC_APP_URL`. Pushes to `main` run `.github/workflows/railway-deploy.yml`.

6. Deploy. When the health check passes, open the generated domain.

## Option B: Railway CLI

```bash
npm install -g @railway/cli
railway login
cd kickboard
railway init          # link or create project
railway up            # deploy current directory
railway domain        # optional public URL
```

Set the same variables with `railway variables set KEY=value`.

## Optional services

See [`docs/railway-services.md`](./railway-services.md) for Postgres, Redis, and the API-Football worker.

## Verify

```bash
curl -fsS https://<your-domain>/api/health
```

Expected: `{"ok":true,"service":"kickboard",...}`
