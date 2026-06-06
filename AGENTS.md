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

`/admin/data-sources` accepts **Google OAuth** on `ADMIN_EMAILS` (default `laszlo.dorgai@gmail.com`) or optional legacy `ADMIN_DATA_SOURCES_TOKEN` (see `.env.example`).

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

### Home feed hero background

The main feed uses `feed-browser--hero-backdrop` with optimized WebP in `public/images/` (`kickboard-hero-spain*.webp`). Layers: fixed photo (right-weighted) + left readability gradient + subtle Spain red radial tint. Do not put text directly on the raw photo — feed cards use semi-transparent `--kickboard-hero-surface` (frosted) over the hero, not opaque full-bleed text on the photo. See `public/images/README.md` for replace/optimize steps and photo attribution.

### Selection surfaces (no contour lines)

Kickboard avoids **contour** selection chrome — no border rings, `outline` boxes, or `box-shadow: 0 0 0 Npx` halos on selected/active interactive items.

Use instead:

- Filled surfaces: `--kickboard-pick-active-bg` for **team/player picks**; `--kickboard-tab-active-bg` for **nav/feed tabs** and saved squad cards; `--kickboard-tab-hover-bg` on hover
- Depth: `box-shadow: var(--shadow-surface)` and `var(--shadow-surface-hover)`

Applies to **Fan Chat**, **saved Coach Board squads** (`.saved-squad-card.selected`), **match/tournament picks**, and similar toggles. Reserve `outline` for **`:focus-visible`** keyboard focus only. Structural card shells may keep borders; selection state should not add new contour lines.

**Grey fill text:** **Nav/feed tabs** and **saved squad cards** use dark grey (`--kickboard-tab-active-bg`) with light text (`--kickboard-tab-active-fg`). **Team/player picks** (tournament teams, scorer chips, fixture picker, player pick fields) use accent-tinted `--kickboard-pick-active-bg` / `--kickboard-pick-active-fg`. See the `:is(...)` rules near `.nav-tabs a.active` in `globals.css`. Light page grey (`--color-bg`) keeps normal dark text.

### Feed UI flags and typography

- Country flags load from `flagcdn.com` via native `<img>` in `team-label.tsx` (not `next/image`); use fixed `32x24` / `40x30` / `48x36` CDN paths from `flagImageUrl()` — arbitrary widths like `w32` return **404** and show gray fallbacks.
- Marketing `h1`/`h2` sizes are overridden inside `.feed-browser` in `globals.css` so bracket/match/player sections stay readable.
- Knockout bracket cards use stacked `MatchTeamsLine` with **sm** flags so logos match the match detail panel.
- Past-events knockout layout: full-width **Route to the final** bracket on top; match list, summary, team stats/lineups, event timeline, and player stats stack in `.knockout-widgets` rows below (not side-by-side with the tree).
- Gap tracker: [`docs/feed-browser-roadmap.md`](docs/feed-browser-roadmap.md).
- Feed & infrastructure status (`FeedStatusPanel`) lives on `/admin/data-sources`, not the public homepage.
- **Coach Board** (`#coach-board`) is **per fixture**: match picker (left) + board (right). Squads/posts use `fixture_key`; run `npm run db:schema` (includes `db/auth-extensions.sql`, `db/fixture-scope-extensions.sql`).
- **Help menu** (header): Welcome tour (`Help → Welcome tour`), **Kickboard AI** / **Ask admin** (`content/help-knowledge/`, optional `OPENAI_API_KEY`). All threads in **Admin → Help** (`db/help-support-extensions.sql`). See `docs/help-support.md`.
- **Mobile bottom / in-page tab docks** (`@media (max-width: 860px)` in `globals.css`): use **fully rounded** pills (`border-radius: 9999px`), **12px** tab labels, **44px** min touch height, **5px** rail padding, and `box-shadow: var(--shadow-surface)` like the header Menu button. Do not shrink to 11px type or 16px corner radius on floating docks — that regressed readability (see commits around `680ac62` / `b37ffea`).
- **Coach Board pitch DnD**: bench chips are `<div draggable>` (not `<button>`) with pointer-drag to `SquadPitch` via `pitchDropRef` (`tryDropPlayer`); pitch tokens reposition with pointer capture only (no HTML5 `draggable` on tokens). Tap an on-pitch bench chip to remove.
- **Google OAuth** needs `GOOGLE_CLIENT_*`, `AUTH_URL` (public site URL, not `0.0.0.0`), and `JWT_SECRET`/`AUTH_SECRET` on Railway. Verify `/api/auth/providers` shows your Railway host in `callbackUrl`. Public sign-in requires publishing the Google consent screen (`docs/publish-production.md`); `/privacy` and `/terms` are hosted for the privacy policy URL.
- **Header** shows signed-in user + log out when OAuth session is active (`SessionProvider` + `HeaderUserMenu`).
- **Community posts** publish immediately; admins moderate via `/admin/data-sources` (posts, Fan Chat, suspend/ban users).
- **Registration invite email** uses Resend (`RESEND_API_KEY`, `EMAIL_FROM`). See `docs/registration-invitations.md`.
- **Admin access**: Google OAuth allowlist (`ADMIN_EMAILS`, default `laszlo.dorgai@gmail.com`) or legacy `ADMIN_DATA_SOURCES_TOKEN`. Dashboard at `/admin/data-sources` uses tabs (`?tab=overview|sources|users|moderation`). User activity/presence requires `db/user-activity-extensions.sql` via `npm run db:schema`.
- Cloud agents cannot read GitHub/Railway secrets; production `DATABASE_URL` / `RAILWAY_TOKEN` must be set in those dashboards or via local `npm run github:secrets` / `npm run railway:variables`.
- **PWA / Web Push** (`docs/pwa-and-push.md`): optional `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`. Without VAPID, install banner and in-app flows still work; OS push and `npm run push:daily` / `npm run push:match-results` need those vars. Real-time social alerts use `deliverUserAlert` in `src/lib/alerts/deliver.ts` (push on create); match schedule/result alerts push only on first insert (`push: "ifNew"`).
- **Session checkpoint dialog** (`SessionCheckpointDialog`): `GET /api/session-checkpoint` after sign-in; needs Postgres + `fixture_predictions` data for performance section. Upcoming matches use Wikipedia schedule only.
