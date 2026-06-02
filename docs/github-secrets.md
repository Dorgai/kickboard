# GitHub secrets for kickboard

The Cloud Agent **cannot** add repository secrets (GitHub returns 403 for the integration token). Use one of the options below on your machine.

## Secrets the schema workflow needs

| Name | Required? | Where to get it |
|------|-------------|-----------------|
| `RAILWAY_TOKEN` | For deploy + schema (if no `DATABASE_URL`) | Railway → **kickboard** project → **Settings** → **Tokens** |
| `DATABASE_URL` | **Recommended** for schema workflow | Railway → **Postgres** → **Connect** → **Public URL** (not `postgres.railway.internal`) |
| `RAILWAY_PROJECT_ID` | Optional | Railway → kickboard → **Settings** → project ID in URL |
| `RAILWAY_SERVICE_ID` | Optional | kickboard **service** → **Settings** → service ID |

## Repository variable (not secret)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://kickboard-production.up.railway.app` |

## Option A — script (fastest)

```bash
cp deploy/github-secrets.env.example deploy/github-secrets.env
# Edit deploy/github-secrets.env — paste Public URL into DATABASE_URL=
gh auth login
npm run github:secrets
```

## Option B — GitHub UI

1. Open https://github.com/Dorgai/kickboard/settings/secrets/actions
2. **New repository secret** → `DATABASE_URL` = Postgres **Public URL**
3. (If missing) `RAILWAY_TOKEN` = kickboard project token
4. **Variables** tab → `NEXT_PUBLIC_APP_URL` = `https://kickboard-production.up.railway.app`

## After secrets are set

**Actions** → **Apply community schema (production)** → **Run workflow** on `main`  
(Do **not** use **Re-run jobs** on an old failure.)
