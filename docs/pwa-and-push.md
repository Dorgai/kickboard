# PWA and push (MyPicks)

## Add to Home Screen (iPhone / iPad)

MyPicks is a **Progressive Web App (PWA)**:

- Open **https://mypicks.live** in **Safari** (Chrome on iOS cannot install PWAs).
- Tap **Share** → **Add to Home Screen**.
- Launch **MyPicks** from the home screen for a full-screen, app-like experience.

The site also shows a short **install hint** on mobile until you dismiss it or install.

## What works without extra setup

- Web app manifest (`src/app/manifest.ts`)
- App icons (`src/app/icon.tsx`, `src/app/apple-icon.tsx`)
- `apple-mobile-web-app-capable` via Next metadata
- Mobile layout (Predictions, Coach Board, etc.)

## Web Push (mobile & tablet by default)

On **phones and tablets** (viewport ≤ 1024px), signed-in users are prompted once for notification permission and subscribed automatically when they allow it. Desktop users are only subscribed if permission was already granted.

Push covers:

- Daily match-day digest (scheduled cron)
- Full-time match results (scheduled cron every 30 minutes when API-Football is configured)
- Upcoming matches within 72 hours (first time each fixture is seen)
- Connection requests and acceptances
- Fan Chat messages (direct and broadcast)
- Friends' prediction updates (add, change, remove)
- Coach Board posts and published squads from connections
- Official messages from MyPicks admin

User preferences default to `notification_channels.push: true` in `user_preferences`.

### Railway / production env

Set:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (mailto: or https URL)
- `CRON_SECRET` for `POST /api/cron/push-daily`, `POST /api/cron/push-match-results`, and GitHub Actions
- `API_FOOTBALL_KEY` (optional but required for live match-result push)

Generate keys: `npx web-push generate-vapid-keys`

Apply schema (includes `push_subscriptions`):

```bash
npm run db:schema
```

Without VAPID keys, install and in-app use still work; OS notification push does not.
