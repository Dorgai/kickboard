# Fan auth (Google OAuth)

Fans sign in on **Current event** with Google. Accounts live in `users` with `oauth_provider` / `oauth_subject` (see `db/auth-extensions.sql`).

Until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on the **kickboard web service**, the UI shows “Google OAuth is not configured”.

## 1. Create a Google OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized JavaScript origins** (production):
   - `https://kickboard-production.up.railway.app`
5. **Authorized redirect URIs** (must match exactly):
   - `https://kickboard-production.up.railway.app/api/auth/callback/google`
6. Copy the **Client ID** and **Client secret**.

For local dev, also add:

- Origins: `http://localhost:3000`
- Redirect: `http://localhost:3000/api/auth/callback/google`

## 2. Set Railway variables (kickboard service)

In Railway → **kickboard** project → **kickboard** service → **Variables**:

| Variable | Value |
|----------|--------|
| `GOOGLE_CLIENT_ID` | From Google Cloud |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud |
| `AUTH_SECRET` | Optional; if unset, `JWT_SECRET` is used |
| `JWT_SECRET` | Already set (session signing) |
| `NEXT_PUBLIC_APP_URL` | `https://kickboard-production.up.railway.app` |

**Redeploy** the service after saving variables (Railway usually redeploys automatically).

Verify: open `https://kickboard-production.up.railway.app/api/auth/config` — expect `"oauthConfigured":true`.

## CLI sync (optional)

```bash
export RAILWAY_TOKEN="..."
export GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="..."
npm run railway:variables
```

## Onboarding

After first Google sign-in, fans enter **birth year** (child-safety). Under-13 accounts are blocked from posting.

## Features gated by sign-in

- **Coach Board** — squad builder + `squad_share` posts
- **Fan Chat** — text posts (`post_type = text`)
- **Predictions** — UI placeholder; settlement in a later phase

## Database

Run `npm run db:schema` (includes `db/auth-extensions.sql`) on production after deploy.
