# PWA and push (Kickboard)

## Add to Home Screen (iPhone / iPad)

Kickboard is a **Progressive Web App (PWA)**:

- Open **https://kickboard-production.up.railway.app** in **Safari** (Chrome on iOS cannot install PWAs).
- Tap **Share** → **Add to Home Screen**.
- Launch **Kickboard** from the home screen for a full-screen, app-like experience.

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
- Connection requests and acceptances
- Friends' prediction updates

User preferences default to `notification_channels.push: true` in `user_preferences`.

### Railway / production env

Set:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (mailto: or https URL)
- `CRON_SECRET` for `POST /api/cron/push-daily` and GitHub Actions digest

Generate keys: `npx web-push generate-vapid-keys`

Apply schema (includes `push_subscriptions`):

```bash
npm run db:schema
```

Without VAPID keys, install and in-app use still work; OS notification push does not.
