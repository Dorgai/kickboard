# Publish MyPicks for everyone (not just Google test users)

When your Google OAuth app is in **Testing** mode, only emails listed under **Test users** can sign in. To let any fan use MyPicks with Google, publish the OAuth consent screen and point Google at your live legal pages.

## Checklist

### 1. Production site is live

- URL works: `https://mypicks.live` (or your custom domain).
- Railway **kickboard** service variables:
  - `AUTH_URL` = your public URL (no trailing slash)
  - `NEXT_PUBLIC_APP_URL` = same URL
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`
- Verify:
  - [`/api/auth/config`](https://mypicks.live/api/auth/config) → `oauthConfigured: true`, `privacyPolicyUrl` set
  - [`/api/auth/providers`](https://mypicks.live/api/auth/providers) → `callbackUrl` uses your public host (not `0.0.0.0`)

### 2. Google OAuth client redirect URIs

[Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → your **Web client**:

| Field | Value |
|--------|--------|
| Authorized JavaScript origins | `https://YOUR-PUBLIC-HOST` |
| Authorized redirect URIs | `https://YOUR-PUBLIC-HOST/api/auth/callback/google` |

If you use a custom domain, add both Railway and custom URLs while migrating.

### 3. OAuth consent screen (required for public sign-in)

**APIs & Services** → **OAuth consent screen**:

| Field | What to enter |
|--------|----------------|
| User type | **External** (so anyone with a Google account can sign in) |
| App name | `MyPicks` |
| User support email | Your email |
| Developer contact | Your email |
| Application home page | `https://YOUR-PUBLIC-HOST` |
| Privacy policy | `https://YOUR-PUBLIC-HOST/privacy` |
| Terms of service (optional) | `https://YOUR-PUBLIC-HOST/terms` |
| Authorized domains | `railway.app` and/or your custom root domain (e.g. `kickboard.example.com`) |

**Scopes:** MyPicks uses Google’s default sign-in scopes (`openid`, `email`, `profile`). Do not add extra sensitive scopes unless you need them — extra scopes trigger stricter Google verification.

### 4. Publish the app (leave Testing)

1. On the OAuth consent screen, confirm **Publishing status** shows **Testing** first.
2. Complete all required fields (including privacy policy URL).
3. Click **Publish app** (or **Go to production**).
4. Status should become **In production**.

Anyone can now sign in. Google may show an **unverified app** warning until you complete [brand verification](https://support.google.com/cloud/answer/9110914) if you request sensitive scopes or high user volume; default email/profile scopes often work without full verification for smaller apps.

### 5. Database and features

```bash
export DATABASE_URL="<public-postgres-url>"
npm run db:schema
```

Confirm [`/api/community/status`](https://mypicks.live/api/community/status) → `schemaReady: true`.

### 6. Custom domain (optional)

1. Railway → kickboard service → **Settings** → **Networking** → add custom domain.
2. Update `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, Google redirect URIs, and consent screen URLs to the new domain.
3. Redeploy.

## Still “Access blocked”?

| Symptom | Fix |
|---------|-----|
| Only some Gmail accounts work | App still in **Testing** — publish or add those emails as test users |
| Error 400 `invalid_request` | Redirect URI mismatch — match `/api/auth/callback/google` exactly in Google Credentials |
| Redirect to `0.0.0.0` | Set `AUTH_URL` on Railway to public URL and redeploy |
| Sign-in works then server error | Run `npm run db:schema` on production (`authSchemaReady` in `/api/auth/config`) |

## Related docs

- [`docs/auth-oauth.md`](auth-oauth.md) — create OAuth client and Railway variables
- [`docs/deploy-railway.md`](deploy-railway.md) — deploy pipeline
