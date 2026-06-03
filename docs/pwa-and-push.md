# PWA install and Web Push

Kickboard supports **Add to Home Screen** on phones and tablets, a generated **app icon**, and **Web Push** for:

- **Daily match digest** — fixtures scheduled for the current UTC day
- **Connection activity** — new requests, acceptances, and connection prediction updates

## Setup

1. Apply schema (includes `push_subscriptions`):

   ```bash
   npm run db:schema
   ```

2. Generate VAPID keys:

   ```bash
   npx web-push generate-vapid-keys
   ```

3. Set Railway / `.env` variables:

   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — public key (URL-safe base64)
   - `VAPID_PRIVATE_KEY` — private key
   - `VAPID_SUBJECT` — e.g. `mailto:you@yourdomain.com`
   - `CRON_SECRET` — random string for the daily cron endpoint

4. Schedule daily pushes (choose one):

   - **Railway cron** — `POST https://<app>/api/cron/push-daily` with header `Authorization: Bearer <CRON_SECRET>` (e.g. 08:00 UTC).
   - **CLI** — `npm run push:daily` with `DATABASE_URL` and VAPID vars set.

## User flow

On viewports ≤1024px, a banner offers **Install** (Chrome/Android) or **Share → Add to Home Screen** (iOS) and **Enable alerts**. Users must be signed in to subscribe.

Push respects `user_preferences.notification_channels.push` (default `true`).

## Assets

- `/manifest.webmanifest` — install metadata
- `/logo.svg` — header and banner
- `/icon`, `/apple-icon`, `/icons/192`, `/icons/512` — generated PNG marks
