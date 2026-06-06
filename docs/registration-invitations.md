# Registration invitations

Existing onboarded fans can invite someone who is **not on MyPicks yet** to register via Google OAuth.

## Flow

1. Inviter opens **Community** (Coach Board tab) → **Invite someone to register**.
2. Optional: invitee email (locks the invite to that Google account) and a short message.
3. With an email address, MyPicks can **send the invite by email** (Resend). You can still copy the link (`/invite/{token}`) as a backup.
4. Invitee opens the link → **Continue with Google** → birth-year onboarding.
5. On onboarding (or sign-in if already onboarded), the invite is redeemed:
   - `users.invited_by_user_id` is set
   - Inviter and invitee become **connected** (`connections.status = accepted`)

## API

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/invitations` | Yes | List sent invitations |
| `POST /api/invitations` | Yes | Create invitation |
| `DELETE /api/invitations/[id]` | Yes | Revoke pending invite |
| `GET /api/invitations/lookup?token=` | No | Public preview |
| `POST /api/invitations/start` | No | Set invite cookie, validate token |
| `POST /api/invitations/redeem` | Yes | Redeem cookie (existing users) |

## Database

Apply `db/registration-invitations-extensions.sql` via `npm run db:schema` (included in apply script).

## Email delivery (Resend)

Set on Railway (or local `.env`):

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | API key from [Resend](https://resend.com) |
| `EMAIL_FROM` | Verified sender, e.g. `MyPicks <invites@yourdomain.com>` |

**You cannot use `@gmail.com` (or Yahoo/Outlook) as `EMAIL_FROM`.** Resend requires a domain you verify in their dashboard, or their test address:

```env
EMAIL_FROM=MyPicks <onboarding@resend.dev>
```

Inviters’ Gmail addresses are still used as **Reply-To**, so replies go to the person who sent the invite.

`POST /api/invitations` accepts `sendEmail` (default `true` when `inviteeEmail` is set). If email is requested but these variables are missing or `EMAIL_FROM` uses a blocked domain, the API returns **503** with setup instructions. If sending fails after the invite is created, the API still returns the invitation and `emailDelivery.reason = "send_failed"`.

For production, add your domain at [resend.com/domains](https://resend.com/domains), then set e.g. `MyPicks <invites@hellokickboard.com>` once DNS is verified.

Also ensure `AUTH_URL` or `NEXT_PUBLIC_APP_URL` points at your public site so invite links in emails are correct.

### Using Railway’s default URL (no custom domain)

Two different “domains” are involved:

| Purpose | What to use |
|---------|-------------|
| **Invite links in the app** | Your Railway URL is fine, e.g. `https://kickboard-production.up.railway.app`. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to that value on Railway. |
| **Sending email via Resend** | You **cannot** use `*.up.railway.app` as `EMAIL_FROM` — you do not control DNS for Railway’s domain, so Resend will not verify it. |

**Without buying a domain**, the supported path is:

1. Leave **Their email** blank → **Create invite link** → **Copy link** → share by text, WhatsApp, Slack, etc.
2. Optionally lock an invite to a friend’s Google account by entering **their** email (still use **Copy link**; do not rely on Resend until you have a verified sending domain).

**If you add a domain later** (often ~$10–15/year for email only): verify it in Resend for `EMAIL_FROM`, and optionally point the same domain’s website to Railway via a CNAME — the app can stay on Railway while mail uses Resend DNS.

### Resend test mode (`onboarding@resend.dev`)

If `EMAIL_FROM` is `MyPicks <onboarding@resend.dev>`, Resend only delivers to **the email on your Resend account** (the address you signed up with). Inviting any other address returns **403** — the invite is still created; use **Copy link**.

To email arbitrary invitees:

1. [resend.com/domains](https://resend.com/domains) → add your domain → add DNS records → wait for **Verified**.
2. Railway → `EMAIL_FROM=MyPicks <invites@yourdomain.com>` (must use that domain, not Gmail).
3. Redeploy kickboard production.

## Limits

- Invites expire after **14 days**.
- Up to **25** open pending invites per inviter.
- Fan Mode (under-13) accounts cannot send invites.
