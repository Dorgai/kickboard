# Railway service plan

KickStats should start on Railway with a small set of services and grow only when code needs the
separation. The first deploy can be run with one web service plus managed Postgres and Redis.

## Create now

### 1. Next.js Web

- **Railway type:** service from this GitHub repository
- **Build:** Nixpacks, using `npm ci && npm run build`
- **Start:** `npm run start -- --hostname 0.0.0.0 --port ${PORT:-3000}`
- **Health check:** `/api/health`
- **Purpose:** SSR/PWA frontend, route handlers, early backend-for-frontend endpoints
- **Variables:**
  - `NEXT_PUBLIC_APP_URL`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_SECRET`
  - provider secrets as features are added: Stripe, OAuth, API-Football

### 2. PostgreSQL

- **Railway type:** Railway Postgres plugin
- **Purpose:** primary durable store for users, tournaments, teams, players, matches, squads, social data,
  subscriptions, moderation and audit history
- **Initial schema:** `db/schema.sql`
- **Notes:** the spec calls for TimescaleDB later. Railway Postgres is enough for the MVP schema; if
  Timescale-specific hypertables become a hard requirement, use a Postgres provider that supports the
  Timescale extension or split time-series storage.

### 3. Redis

- **Railway type:** Railway Redis plugin
- **Purpose:** live match pub/sub, cache, rate-limit counters, sorted-set leaderboards, notification queues
- **Variable:** `REDIS_URL`

## Add when implementation needs them

### 4. Worker

- **Railway type:** second service from the same repository
- **Purpose:** API-Football polling/webhook processing, prediction settlement, wallet credits, moderation
  processing, GDPR deletion jobs and notification delivery
- **Why separate:** these jobs should not block Next.js request/response paths and will need independent
  restart/scale settings.

### 5. Analytics API

- **Railway type:** separate FastAPI service or later monorepo package
- **Purpose:** StatsBomb ingestion, Pro/Elite query builder, correlation jobs and exports
- **Why later:** heavy analytics should be isolated after the core fan product is stable.

## External services not created as Railway services

- **Stripe:** hosted checkout, webhooks and billing portal
- **API-Football:** live match data provider
- **Object storage/CDN:** S3 + CloudFront, Cloudflare R2, or equivalent for portraits and uploaded images
- **Moderation providers:** OpenAI Moderation/AWS Comprehend and AWS Rekognition or equivalent
- **Push notifications:** Web Push/FCM

## Safety defaults

- Child accounts remain `tier = 'fan'` at the database level.
- Predictions and wallet points are internal-only and cannot be purchased, transferred or redeemed.
- Community features should ship behind moderation before public posting is enabled.
- Secrets stay in Railway variables; `.env.example` is only a local template.
