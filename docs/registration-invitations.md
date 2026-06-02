# Registration invitations

Existing onboarded fans can invite someone who is **not on Kickboard yet** to register via Google OAuth.

## Flow

1. Inviter opens **Community** (Coach Board tab) → **Invite someone to register**.
2. Optional: invitee email (locks the invite to that Google account) and a short message.
3. Share the generated link (`/invite/{token}`).
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

## Limits

- Invites expire after **14 days**.
- Up to **25** open pending invites per inviter.
- Fan Mode (under-13) accounts cannot send invites.
