# Registration invitations

Existing onboarded fans can invite someone who is **not on Kickboard yet** to register via Google OAuth.

## Flow

1. Inviter opens **Community** (Coach Board tab) → **Invite someone to register**.
2. Optional: invitee email (locks the invite to that Google account) and a short message.
3. With an email address, Kickboard can **send the invite by email** (Resend). You can still copy the link (`/invite/{token}`) as a backup.
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
| `EMAIL_FROM` | Verified sender, e.g. `Kickboard <invites@yourdomain.com>` |

`POST /api/invitations` accepts `sendEmail` (default `true` when `inviteeEmail` is set). If email is requested but these variables are missing, the API returns **503** with setup instructions. If sending fails after the invite is created, the API still returns the invitation and `emailDelivery.reason = "send_failed"`.

For testing, Resend allows `onboarding@resend.dev` as the from-address on free accounts once the API key is set.

Also ensure `AUTH_URL` or `NEXT_PUBLIC_APP_URL` points at your public site so invite links in emails are correct.

## Limits

- Invites expire after **14 days**.
- Up to **25** open pending invites per inviter.
- Fan Mode (under-13) accounts cannot send invites.
