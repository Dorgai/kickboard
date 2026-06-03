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

## Optional: Web Push

Set on Railway / GitHub secrets:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (mailto: or https URL)
- `CRON_SECRET` for scheduled push jobs

Without VAPID, install and in-app use still work; OS notification push does not.
