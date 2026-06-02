# In-app alerts

Signed-in users get alerts from the bell icon in the header.

## Sources

| Category | When |
|----------|------|
| **Connection activity** | A connected fan updates predictions, saves/publishes a Coach Board, or posts (approved) |
| **Upcoming match** | Kickoff within ~72h from the public WC26 schedule (Wikipedia); enriched by API-Football when `API_FOOTBALL_KEY` is set |
| **Match result** | Full-time scores from API-Football (`last` + live fixtures for the World Cup league, when the key is set) |

## API

- `GET /api/alerts` — syncs from sources, returns list + unread count
- `PATCH /api/alerts` — `{ "alertId": "..." }` or `{ "markAll": true }`

Alerts are stored in `user_alerts` (deduped by `alert_key`). Apply `db/user-alerts-extensions.sql` via `npm run db:schema`.

## Polling

The header panel refreshes every 60 seconds while you are signed in.

Optional env for API-Football World Cup filtering (defaults: league `1`, season `2026`):

- `API_FOOTBALL_LEAGUE_ID`
- `API_FOOTBALL_SEASON`
