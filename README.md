# Kickboard

Railway-ready greenfield scaffold for the Kickboard World Cup fan and analytics platform.

The initial implementation is intentionally focused on safe foundations:

- Next.js app router frontend with responsive Kickboard UI sections
- Railway deploy config and health check route
- Explicit service plan for web, Postgres, Redis, worker and analytics boundaries
- Starter PostgreSQL schema based on the uploaded data model
- Product safety guardrails for child accounts, predictions, wallet points and moderation
- Gap closure docs for data ingestion, widget isolation, portraits, legal language, and stat-card sharing
- Homepage data is read from feed endpoints only; no fabricated match, table, squad, leaderboard, or profile data is rendered.
- StatsBomb historical feed browser with World Cup seasons, matches, and event timelines.
- API-Football real-time endpoint and worker foundation; it stays unavailable until provider credentials are configured.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:3000>.

## Verify

```bash
npm run check
```

This runs TypeScript checking and a production Next.js build.

## Deploy to Railway

See [`docs/deploy-railway.md`](docs/deploy-railway.md) to deploy into the existing **kickboard** Railway project (not a new one). Requires `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, and `RAILWAY_TOKEN`.

## Railway services to create

Create these first:

1. **Next.js Web** - deploy this GitHub repo.
2. **PostgreSQL** - attach Railway Postgres and expose `DATABASE_URL`.
3. **Redis** - attach Railway Redis and expose `REDIS_URL`.

Add these later when their code paths exist:

4. **Worker** - background jobs for match ingestion, wallet settlement, moderation, GDPR deletion and push notifications.
5. **Analytics API** - separate FastAPI/Python service for StatsBomb ingestion and Pro/Elite analytics workloads.

Details are in [`docs/railway-services.md`](docs/railway-services.md).

## Product and engineering docs

- [`docs/data-ingestion.md`](docs/data-ingestion.md) - API-Football polling, retries, reconciliation, and StatsBomb sync.
- [`docs/widget-contract.md`](docs/widget-contract.md) - widget data ownership, isolation, and `widget_layout` schema.
- [`docs/portrait-pipeline.md`](docs/portrait-pipeline.md) - SDXL prompt, frame, review, and CDN pipeline.
- [`docs/predictions-legal.md`](docs/predictions-legal.md) - draft legal intent for free-to-play prediction points.
- [`docs/user-stat-card.md`](docs/user-stat-card.md) - profile/share card requirements and data sources.

## Feed endpoints

- `/api/feeds/status` - reports which feeds and infrastructure variables are actually configured.
- `/api/feeds/historical` - checks the public StatsBomb Open Data competitions feed.
- `/api/feeds/historical/matches` - reads matches for a StatsBomb competition/season.
- `/api/feeds/historical/events` - reads event-level data for a StatsBomb match.
- `/api/feeds/realtime` - reports API-Football worker readiness. This remains inactive until `API_FOOTBALL_KEY` and a running worker service are configured.

## Admin data source dashboard

Open **`/admin/data-sources`** as an allowlisted Google account (`ADMIN_EMAILS`, default
`laszlo.dorgai@gmail.com`) or with a legacy operator token.

- Page: `/admin/data-sources` (Google sign-in) or `/admin/data-sources?token=<ADMIN_DATA_SOURCES_TOKEN>`
- API: `/api/admin/*` with session cookies (OAuth admin) or `Authorization: Bearer <ADMIN_DATA_SOURCES_TOKEN>` / `x-admin-token`

It shows feed connections, refresh cadence, infrastructure status, user activity, and moderation tools.

## Worker

Run the API-Football worker with:

```bash
npm run worker:api-football
```

Required variables:

- `REDIS_URL`
- `API_FOOTBALL_KEY`
- `KICKBOARD_WORKER_ENABLED=true` on the web service when the worker is live
- `ADMIN_DATA_SOURCES_TOKEN` for the admin-only data source dashboard

## Important safety constraints

- Child accounts must stay in Fan Mode with no direct messaging, no public profile and no upgrade prompts.
- Prediction points are non-monetary; they cannot be bought, transferred or redeemed.
- Public community posting should not launch without moderation and reporting flows.
- Licensed data sources and generated portrait provenance must remain auditable.
