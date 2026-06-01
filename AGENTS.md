# AGENTS.md

## Cursor Cloud specific instructions

### Repository branch note

The runnable Next.js app is on **`main`**. Use `main` for Railway deploys and local development unless working on a feature branch.

### Services

| Service | Required locally? | How to run |
|---------|-------------------|------------|
| Next.js web (`npm run dev`) | Yes | Default dev entry point on port 3000 |
| PostgreSQL | No for feed browser MVP | `.env` placeholders satisfy config checks; attach Railway/local Postgres when DB features are implemented |
| Redis | No for feed browser MVP | Same as Postgres; required for `npm run worker:api-football` |
| API-Football worker | Optional | `npm run worker:api-football` with `REDIS_URL`, `API_FOOTBALL_KEY`, and `KICKBOARD_WORKER_ENABLED=true` |

The homepage and StatsBomb historical feeds work without Postgres, Redis, or API-Football credentials. StatsBomb data is fetched from the public GitHub open-data feed at request time.

### Standard commands

See `README.md` for full detail. Quick reference:

- Install: `npm install` then `cp .env.example .env`
- Dev server: `npm run dev` → http://localhost:3000
- Verify (typecheck + production build): `npm run check`
- Health: `GET /api/health`
- Feed status: `GET /api/feeds/status`

There is no separate ESLint script; `npm run typecheck` is the static analysis check.

### Dev server in Cloud Agent VMs

Use a dedicated tmux session (for example `kickboard-dev`) so the Next.js process survives across shell commands:

```bash
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s kickboard-dev -c /workspace -- bash -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t kickboard-dev:0.0 'npm run dev' C-m
```

Wait for `curl -sf http://localhost:3000/api/health` before browser or API tests.

### Admin dashboard (optional)

`/admin/data-sources` requires `ADMIN_DATA_SOURCES_TOKEN` in `.env` (see `.env.example`). On Railway, set the same variable via the dashboard or `npm run railway:variables` with `RAILWAY_TOKEN` exported.

### Railway deploy

Deploy only into **kickboard** / **production** (see `deploy/railway.project.json`). Never other projects or environments. See [`docs/deploy-railway.md`](docs/deploy-railway.md).

Automated deploys need GitHub Actions secret **`RAILWAY_TOKEN`** (kickboard project token). Without it, pushes to `main` build in CI but production stays stale.

CLI deploy (same token): `export RAILWAY_TOKEN=... && npm run railway:deploy`
