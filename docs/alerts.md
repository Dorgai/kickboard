# In-app alerts

Signed-in users get alerts from the bell icon in the header.

## Sources

| Category | When |
|----------|------|
| **Connection activity** | A connected fan updates predictions, saves/publishes a Coach Board, or posts (approved) |
| **Upcoming match** | Kickoff within ~72h (API-Football `next` fixtures, when live data is configured) |
| **Match result** | Full-time scores from API-Football `last` fixtures |

## API

- `GET /api/alerts` — syncs from sources, returns list + unread count
- `PATCH /api/alerts` — `{ "alertId": "..." }` or `{ "markAll": true }`

Alerts are stored in `user_alerts` (deduped by `alert_key`). Apply `db/user-alerts-extensions.sql` via `npm run db:schema`.

## Polling

The header panel refreshes every 60 seconds while you are signed in.
