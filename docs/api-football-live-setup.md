# Live scores in the match picker (Option A)

Turn on API-Football for **Live** / **FT** badges in the Coach Board fixture picker. The static WC26 schedule still works without this; live data only enriches the picker when a match is in progress or finished.

## What you need

| Item | Required? | Notes |
|------|-----------|--------|
| [API-Football](https://www.api-football.com/) account + API key | **Yes** | Free tier has daily request limits; paid tiers for heavy traffic |
| `API_FOOTBALL_KEY` on the **kickboard web** Railway service | **Yes** | The Next.js app calls `/fixtures?live=all` from the server |
| `KICKBOARD_WORKER_ENABLED=true` on the **same web** service | **Yes** | Feature flag (not “is a worker running”) — must be the string `true` |
| Redis + `npm run worker:api-football` | No (for picker) | Optional second service; caches polls for future settlement/pub-sub. The picker does **not** read Redis today |

## Railway (production) — UI

1. Open [Railway](https://railway.app) → project **kickboard** → service **kickboard** (the web app, not Postgres).
2. **Variables** → add or edit:
   - `API_FOOTBALL_KEY` = your key from [api-sports.io dashboard](https://dashboard.api-football.com/)
   - `KICKBOARD_WORKER_ENABLED` = `true` (lowercase; no quotes in the value field)
3. **Deploy** → trigger a redeploy (or push to `main` if deploy-on-push is enabled).
4. Verify (replace host if yours differs):

```bash
curl -sS "https://kickboard-production.up.railway.app/api/feeds/realtime" | jq .
```

Expect `"connected": true` and a `fixtures` array when games are live. Off-season or between match days, `fixtures` may be empty even when connected.

Also check status summary:

```bash
curl -sS "https://kickboard-production.up.railway.app/api/feeds/status" | jq .feeds.realtime
```

## Railway — CLI / script

From a machine with `RAILWAY_TOKEN` and service IDs (see `deploy/railway-variables.env.example`):

```bash
export RAILWAY_TOKEN=...
export API_FOOTBALL_KEY=your_key_here
# optional: source deploy/railway-variables.env for PROJECT_ID / SERVICE_ID
npm run railway:variables
```

The configure script sets `API_FOOTBALL_KEY` when present and sets `KICKBOARD_WORKER_ENABLED=true` on the web service, then redeploys.

## Local dev

```bash
# .env.local (never commit the key)
API_FOOTBALL_KEY=...
KICKBOARD_WORKER_ENABLED=true
npm run dev
```

Open `http://localhost:3000/api/feeds/realtime`.

## Optional: background worker

If you add Railway **Redis** and a second service from the same repo:

- **Start command:** `npm run worker:api-football`
- **Variables:** `REDIS_URL`, `API_FOOTBALL_KEY` (same key as web)

This polls every 60s and writes `api-football:live-fixtures` in Redis. The web route does not use that cache yet; it is for rate-limit headroom and future features (prediction settlement, pub/sub).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `connected: false`, `keyConfigured: false` | Set `API_FOOTBALL_KEY` on the **web** service and redeploy |
| `keyConfigured: true`, `workerEnabled: false` | Set `KICKBOARD_WORKER_ENABLED=true` (exact string) |
| `502` + rate limit message | API quota exceeded; wait or upgrade plan; add worker + cache later |
| Connected but picker still all “Upcoming” | No live WC fixtures right now, or team names do not match static schedule (live rows use `api-football:{id}` keys) |
| Picker works, no scores shown | Deploy build that includes score labels in the picker (after live API is connected) |

## Product note

Kickboard does not invent scores when the API is off. Without a key, fans still pick fixtures from the static schedule and use Coach Board normally.
