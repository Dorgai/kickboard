# Fan auth (Google OAuth)

Fans sign in on **Current event** with Google. Accounts live in `users` with `oauth_provider` / `oauth_subject` (see `db/auth-extensions.sql`).

## Railway variables

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `AUTH_SECRET` or `JWT_SECRET` | NextAuth session signing |

Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`

## Onboarding

After first Google sign-in, fans enter **birth year** (child-safety). Under-13 accounts are blocked from posting.

## Features gated by sign-in

- **Coach Board** — squad builder + `squad_share` posts
- **Fan Chat** — text posts (`post_type = text`)
- **Predictions** — UI placeholder; settlement in a later phase

## Database

Run `npm run db:schema` (includes `db/auth-extensions.sql`) on production after deploy.
