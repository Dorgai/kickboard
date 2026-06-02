# Community (Coach Board)

Moderated public posting for the **Current event** tab. Historical match data stays read-only; community lives beside the live tournament summary.

## Safety model

- Accounts under **13** cannot register for posting (Fan Mode).
- New posts are stored as `moderation_status = withheld` until an admin approves them.
- Reporting a post hides it (`withheld`) until review.
- Full user auth, DMs, and child profiles are later phases.

## Authentication (no user password yet)

Community MVP does **not** use email/password login for fans.

| What | Purpose |
|------|---------|
| **Join form** | Display name + birth year creates a row in `users` (synthetic `@community.kickboard.local` email). |
| **`kickboard_community_session` cookie** | HttpOnly cookie signed with server `JWT_SECRET`. This is your session — not shown or copied manually. |
| **`JWT_SECRET`** | Railway env var used to sign community (and future) sessions. Operators set it; users never see it. |
| **`ADMIN_DATA_SOURCES_TOKEN`** | Separate secret for `/admin/data-sources` and the moderation API. Not the same as community join. |

Full email/password auth, verification, and password reset are a later phase.

## Setup

1. Attach **Railway Postgres** and set `DATABASE_URL`.
2. Set `JWT_SECRET` (random string; same pool as future auth).
3. Apply schema (**required** — without this, join returns 500):

```bash
export DATABASE_URL=postgresql://USER:PASS@HOST:PORT/railway
npm run db:schema
```

`db:schema` uses Node (`scripts/apply-db-schema.mjs`) so you do not need `psql` installed. On Railway:

```bash
railway link   # kickboard / production
railway run npm run db:schema
```

Or add the production `DATABASE_URL` as a GitHub Actions secret; **Deploy to Railway** runs `db:schema` before each deploy when that secret is set.

Use the **public** Railway Postgres URL from the plugin (Variables → `DATABASE_URL`).

4. Ensure `ADMIN_DATA_SOURCES_TOKEN` is set for the moderation UI.
5. Check `GET /api/community/status` — `schemaReady` must be `true`.

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

## Next steps (product)

1. **Email/password auth** — replace lightweight join with verified accounts and recovery flows.
2. **Squad share posts** — `post_type = squad_share` linked to saved lineups.
3. **Match-linked posts** — attach `match_id` when sharing takes from Past events.
4. **Comments** — `comments` table (schema today only has `comment_count` on posts).
5. **Reactions** — use `reaction_counts` jsonb on posts.
6. **Rate limits** — Redis counters on post/report endpoints.
7. **Moderation worker** — auto-withhold on report thresholds; optional AI screening.
8. **Notifications** — worker fan-out when posts are approved or replied to.
