# Community (Coach Board)

Moderated public posting for the **Current event** tab. Historical match data stays read-only; community lives beside the live tournament summary.

## Safety model

- Accounts under **13** cannot register for posting (Fan Mode).
- New posts are stored as `moderation_status = withheld` until an admin approves them.
- Reporting a post hides it (`withheld`) until review.
- Full user auth, DMs, and child profiles are later phases.

## Setup

1. Attach **Railway Postgres** and set `DATABASE_URL`.
2. Set `JWT_SECRET` (same as future auth).
3. Apply schema:

```bash
export DATABASE_URL=postgresql://...
npm run db:schema
```

4. Ensure `ADMIN_DATA_SOURCES_TOKEN` is set for the moderation UI.

## API

| Route | Purpose |
|-------|---------|
| `GET /api/community/status` | Whether DB + JWT are configured |
| `GET/POST/DELETE /api/community/session` | Join, current user, sign out |
| `GET /api/community/posts` | Approved public feed |
| `POST /api/community/posts` | Submit text post (withheld) |
| `POST /api/community/posts/:id/report` | Report post |
| `GET/PATCH /api/admin/community/posts` | Moderation queue (admin bearer token) |

## UI

- **Current event → Community** (`#community`): feed, join form, compose, report.
- **Admin → Data sources**: moderation queue when Postgres is configured.

## Next steps

- Squad share and match-linked posts (`post_type` + `squad_id` / `match_id`)
- Comments table and reaction counts
- Redis rate limits and automated moderation hooks
- Worker jobs for notifications
