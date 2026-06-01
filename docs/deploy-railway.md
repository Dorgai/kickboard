# Deploy Kickboard to Railway

## Option A: GitHub deploy (recommended)

1. Open [Railway](https://railway.com) and create a **New Project**.
2. Choose **Deploy from GitHub repo** and select `Dorgai/kickboard`.
3. Set the service branch to **`main`** (contains the Next.js app and `railway.json`).
4. Railway reads `railway.json`:
   - **Build:** `npm run build` (Nixpacks)
   - **Start:** `npm run start -- --hostname 0.0.0.0 --port $PORT`
   - **Health check:** `/api/health`
5. Add variables in the service **Variables** tab (minimum for public feeds):

   | Variable | Example / notes |
   |----------|-----------------|
   | `NEXT_PUBLIC_APP_URL` | `https://<your-service>.up.railway.app` |
   | `ADMIN_DATA_SOURCES_TOKEN` | Strong random string for `/admin/data-sources` |
   | `JWT_SECRET` | Strong random string |
   | `DATABASE_URL` | From Railway Postgres plugin (optional for feed browser MVP) |
   | `REDIS_URL` | From Railway Redis plugin (optional until worker is used) |

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
