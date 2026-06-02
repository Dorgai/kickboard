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
| API-Football live picker | Optional (production) | Web service: `API_FOOTBALL_KEY` + `KICKBOARD_WORKER_ENABLED=true` — see `docs/api-football-live-setup.md`. Background worker optional: `npm run worker:api-football` with `REDIS_URL` |

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

### Production deploy status (verify after any deploy)

```bash
BASE=https://kickboard-production.up.railway.app
curl -fsS "$BASE/api/health"
curl -sS -o /dev/null -w "admin/session: %{http_code}\n" "$BASE/api/admin/session"   # expect not 404 on current main
curl -sS "$BASE/" | grep -c feed-status-grid || true                                 # expect 0 on current main
```

If GitHub Actions fails with `Unauthorized` on **Resolve kickboard production target**, regenerate the token under **kickboard project → Settings → Tokens** and update the `RAILWAY_TOKEN` repo secret, or add `RAILWAY_PROJECT_ID` + `RAILWAY_SERVICE_ID` secrets. Dashboard **Redeploy** only updates production when the service source is connected to `Dorgai/kickboard` branch **`main`**.

### Feed UI flags and typography

- Country flags load from `flagcdn.com` via native `<img>` in `team-label.tsx` (not `next/image`); use fixed `32x24` / `40x30` / `48x36` CDN paths from `flagImageUrl()` — arbitrary widths like `w32` return **404** and show gray fallbacks.
- Marketing `h1`/`h2` sizes are overridden inside `.feed-browser` in `globals.css` so bracket/match/player sections stay readable.
- Knockout bracket cards use stacked `MatchTeamsLine` with **sm** flags so logos match the match detail panel.
- Past-events knockout layout: full-width **Route to the final** bracket on top; match list, summary, team stats/lineups, event timeline, and player stats stack in `.knockout-widgets` rows below (not side-by-side with the tree).
- Gap tracker: [`docs/feed-browser-roadmap.md`](docs/feed-browser-roadmap.md).
- Feed & infrastructure status (`FeedStatusPanel`) lives on `/admin/data-sources`, not the public homepage.
- **Coach Board** (`#coach-board`) is **per fixture**: match picker (left) + board (right). Squads/posts use `fixture_key`; run `npm run db:schema` (includes `db/auth-extensions.sql`, `db/fixture-scope-extensions.sql`).
- **Google OAuth** needs `GOOGLE_CLIENT_*`, `AUTH_URL` (public site URL, not `0.0.0.0`), and `JWT_SECRET`/`AUTH_SECRET` on Railway. Verify `/api/auth/providers` shows your Railway host in `callbackUrl`.
- **Header** shows signed-in user + log out when OAuth session is active (`SessionProvider` + `HeaderUserMenu`).
- **Community posts** are withheld until approved in admin moderation (`/admin/data-sources`).
- Cloud agents cannot read GitHub/Railway secrets; production `DATABASE_URL` / `RAILWAY_TOKEN` must be set in those dashboards or via local `npm run github:secrets` / `npm run railway:variables`.
