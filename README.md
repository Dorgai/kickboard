# KickStats / Kickboard

Railway-ready greenfield scaffold for the KickStats World Cup fan and analytics platform.

The initial implementation is intentionally focused on safe foundations:

- Next.js app router frontend with responsive KickStats UI sections
- Railway deploy config and health check route
- Explicit service plan for web, Postgres, Redis, worker and analytics boundaries
- Starter PostgreSQL schema based on the uploaded data model
- Product safety guardrails for child accounts, predictions, wallet points and moderation

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

## Railway services to create

Create these first:

1. **Next.js Web** - deploy this GitHub repo.
2. **PostgreSQL** - attach Railway Postgres and expose `DATABASE_URL`.
3. **Redis** - attach Railway Redis and expose `REDIS_URL`.

Add these later when their code paths exist:

4. **Worker** - background jobs for match ingestion, wallet settlement, moderation, GDPR deletion and push notifications.
5. **Analytics API** - separate FastAPI/Python service for StatsBomb ingestion and Pro/Elite analytics workloads.

Details are in [`docs/railway-services.md`](docs/railway-services.md).

## Important safety constraints

- Child accounts must stay in Fan Mode with no direct messaging, no public profile and no upgrade prompts.
- Prediction points are non-monetary; they cannot be bought, transferred or redeemed.
- Public community posting should not launch without moderation and reporting flows.
- Licensed data sources and generated portrait provenance must remain auditable.
