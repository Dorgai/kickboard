# Admin dashboard and user activity

## Admin sign-in

Admins can open **`/admin/data-sources`** in two ways:

1. **Google OAuth (recommended)** — sign in with an email on the allowlist.
   - Default: `laszlo.dorgai@gmail.com`
   - Override: Railway variable `ADMIN_EMAILS` (comma-separated)
2. **Operator token** — legacy `ADMIN_DATA_SOURCES_TOKEN` via the gate form (sets `kickboard_admin_token` cookie).

The header **Admin** link appears only when your session has `isAdmin: true`.

## User activity tracking

After `npm run db:schema` (includes `db/user-activity-extensions.sql`):

| Data | How it is collected |
|------|---------------------|
| **Online / last seen** | Browser heartbeat every ~45s (`POST /api/activity/heartbeat`) while signed in |
| **Page views** | Client `POST /api/activity/event` on route change |
| **Sign-in, posts, Fan Chat, squads** | Server-side events on the relevant APIs |

**Online** means `last_seen_at` within the last **3 minutes**.

### Admin UI

**User activity** section (top of admin dashboard):

- Search by username/email
- Filter by date range and “online only”
- Per user: session history (start, duration, last page) and event log

### Admin API

| Route | Purpose |
|-------|---------|
| `GET /api/admin/activity?scope=users` | User list with presence summary |
| `GET /api/admin/activity?scope=events&userId=` | Event log |
| `GET /api/admin/activity?scope=sessions&userId=` | Session history |
| `GET /api/admin/activity?scope=summary` | Online user count |

Requires admin OAuth session (cookies) or `Authorization: Bearer <ADMIN_DATA_SOURCES_TOKEN>`.
