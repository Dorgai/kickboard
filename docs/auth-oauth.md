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
| `AUTH_URL` | `https://kickboard-production.up.railway.app` (**important**) |
| `AUTH_SECRET` | Optional; if unset, `JWT_SECRET` is used |
| `JWT_SECRET` | Already set (session signing) |
| `NEXT_PUBLIC_APP_URL` | `https://kickboard-production.up.railway.app` |

`AUTH_URL` must match the public site URL so Google gets redirect_uri  
`https://kickboard-production.up.railway.app/api/auth/callback/google` (not `localhost`).

**Redeploy** the service after saving variables (Railway usually redeploys automatically).

Verify: open `https://kickboard-production.up.railway.app/api/auth/config` — expect:

- `"oauthConfigured": true`
- `"googleRedirectUri": "https://kickboard-production.up.railway.app/api/auth/callback/google"`

## 3. OAuth consent screen (fixes “Access blocked” / Error 400)

If Google shows **“doesn't comply with OAuth 2.0 policy”** or **Error 400: invalid_request**:

### A. App in **Testing** mode (most common)

1. Google Cloud → **APIs & Services** → **OAuth consent screen**.
2. If **Publishing status** is **Testing**, only **Test users** can sign in.
3. Under **Test users** → **Add users** → add `laszlo.dorgai@gmail.com` (every fan email you want during testing).
4. Or complete verification and **Publish app** (needs privacy policy URL for public use).

### B. Redirect URI mismatch

In **Credentials** → your OAuth client → **Authorized redirect URIs**, must include **exactly**:

`https://kickboard-production.up.railway.app/api/auth/callback/google`

Compare with `googleRedirectUri` from `/api/auth/config`.

### C. Authorized domains

On **OAuth consent screen** → **Authorized domains**, add:

- `railway.app` (covers `*.up.railway.app` Railway hosts)

Fill **App name**, **User support email**, and **Developer contact email**.

### D. Railway `AUTH_URL` missing (redirect goes to `0.0.0.0`)

Auth.js builds Google’s `redirect_uri` from **`AUTH_URL`** or **`NEXTAUTH_URL` only** — not from `NEXT_PUBLIC_APP_URL`.

If those are unset, Railway’s internal host (`0.0.0.0:8080`) is used and Google returns **Error 400: invalid_request** even when test users are configured.

1. Railway → kickboard service → **Variables** → set **`AUTH_URL`** = `https://kickboard-production.up.railway.app` (no trailing slash).
2. Redeploy.
3. Check `https://kickboard-production.up.railway.app/api/auth/providers` — `callbackUrl` must be your Railway host, **not** `https://0.0.0.0:8080/...`.

Kickboard also copies `NEXT_PUBLIC_APP_URL` → `AUTH_URL` at server boot when possible; setting `AUTH_URL` explicitly is still recommended.

If `/api/auth/config` shows `googleRedirectUri` as `http://localhost:3000/...`, set `AUTH_URL` on Railway to your production URL and redeploy.

## CLI sync (optional)

```bash
export RAILWAY_TOKEN="..."
export GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="..."
npm run railway:variables
```

## Onboarding

After first Google sign-in, fans enter **birth year** (child-safety). Under-13 accounts are blocked from posting.

## Coach Board scope

Each **fixture** (upcoming match from the tournament feed) has its own Coach Board. Squads and `squad_share` posts are stored with `fixture_key` so fans only see content for the match they selected.

Run `npm run db:schema` so `db/fixture-scope-extensions.sql` is applied.

## Features gated by sign-in

- **Coach Board** — per-match squad builder + `squad_share` posts
- **Fan Chat** — text posts (`post_type = text`)
- **Predictions** — UI placeholder; settlement in a later phase

## Database

Run `npm run db:schema` (includes `db/auth-extensions.sql`) on production after deploy.

If Google login reaches the callback then shows **Server error / problem with the server configuration**:

1. Open `/api/auth/config` — check `authSchemaReady` is `true`.
2. If `false`, run **`npm run db:schema`** against production Postgres (GitHub workflow **Apply community schema** applies `auth-extensions.sql` too).
3. Clear site cookies or use a private window (old `0.0.0.0` OAuth cookies can confuse the callback).
4. Try sign-in again.
