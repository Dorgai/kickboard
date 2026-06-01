# Deploy Kickboard to the existing Railway project

**Always use your existing `kickboard` Railway project.** Do not run `railway init` or **New Project** in the dashboard — that creates a separate project.

## Find IDs for the kickboard project

1. Open [Railway](https://railway.com) → project **kickboard**.
2. Click the **web** service (Next.js).
3. **Settings** → copy **Service ID** → `RAILWAY_SERVICE_ID`.
4. Project **Settings** → copy **Project ID** → `RAILWAY_PROJECT_ID`.
5. **Settings** → **Tokens** → create a token → `RAILWAY_TOKEN`.

## Option A: GitHub repo on the kickboard project (recommended)

Inside the **kickboard** project (not a new project):

1. **+ New** → **GitHub Repo** *or* open the existing service → **Settings** → **Source**.
2. Repository: **`Dorgai/kickboard`**, branch: **`main`**, root: **`/`**.
3. If Railway created an extra empty project earlier, delete that project or ignore it — only wire **kickboard**.
4. **Redeploy** the service. Build uses `railway.json` / `nixpacks.toml`, health check `/api/health`.
5. **Variables** on this service (minimum):

   | Variable | Notes |
   |----------|--------|
   | `NEXT_PUBLIC_APP_URL` | `https://<this-service-domain>` |
   | `JWT_SECRET` | Random string |
   | `ADMIN_DATA_SOURCES_TOKEN` | Random string |
   | `DATABASE_URL` | From Postgres plugin in **kickboard** (optional) |
   | `REDIS_URL` | From Redis plugin in **kickboard** (optional) |

## Option B: GitHub Actions → same kickboard service

Repo **Settings** → **Secrets and variables** → **Actions**:

| Secret | Required |
|--------|----------|
| `RAILWAY_TOKEN` | Yes |
| `RAILWAY_PROJECT_ID` | Yes (kickboard project) |
| `RAILWAY_SERVICE_ID` | Yes (web service in kickboard) |

Optional secrets: `JWT_SECRET`, `ADMIN_DATA_SOURCES_TOKEN`, `DATABASE_URL`, `REDIS_URL`  
Optional variable: `NEXT_PUBLIC_APP_URL`, `RAILWAY_ENVIRONMENT` (default `production`)

Pushes to **`main`** run `.github/workflows/railway-deploy.yml`, which runs:

`railway up --project <id> --service <id>`

So deploys never create a second project.

## Option C: CLI (link to kickboard only)

```bash
export RAILWAY_TOKEN=...
export RAILWAY_PROJECT_ID=...   # kickboard project
export RAILWAY_SERVICE_ID=...   # web service in kickboard

cp deploy/railway-variables.env.example deploy/railway-variables.env
# fill IDs in railway-variables.env
set -a && source deploy/railway-variables.env && set +a

npm run railway:variables
```

**Do not use** `railway init` (creates a new project). To link locally once:

```bash
railway link --project "$RAILWAY_PROJECT_ID" --environment production
# pick the existing web service when prompted
```

## Not seeing deploys in kickboard?

- Confirm you are in project **kickboard**, not another project name.
- Source branch must be **`main`** with `package.json` at repo root.
- Latest deployment commit should not be "Initial commit" only.
- Check build logs on the **kickboard** service deployment.

## Verify

```bash
curl -fsS https://<your-kickboard-domain>/api/health
```

Expected: `{"ok":true,"service":"kickboard",...}`
