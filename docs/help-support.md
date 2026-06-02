# Help center & support

Fans use **Help** in the header:

- **Welcome tour** — reopens the first-visit dialog.
- **Ask Kickboard AI** — answers from `content/help-knowledge/*.md` (and OpenAI when configured).
- **Ask an admin** — threaded messages stored in Postgres for operator review.

## Database

Apply with the rest of the schema:

```bash
npm run db:schema
```

Tables: `help_conversations`, `help_messages` (`db/help-support-extensions.sql`).

## APIs

| Route | Who |
|-------|-----|
| `GET /api/help/status` | Public — `schemaReady`, `aiConfigured` |
| `GET/POST /api/help/conversations` | Signed-in user (onboarding complete) |
| `GET /api/help/conversations/:id` | Owner |
| `POST /api/help/conversations/:id/messages` | Owner |
| `GET /api/admin/help/conversations` | Admin |
| `GET /api/admin/help/conversations/:id` | Admin |
| `POST /api/admin/help/conversations/:id/messages` | Admin reply (admin channel) |

## Knowledge base

Edit markdown under `content/help-knowledge/`. The server loads files at runtime and retrieves relevant chunks for each question.

Set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`, default `gpt-4o-mini`) on Railway for LLM-backed answers. Without it, users still get excerpt-based replies.

## Admin

**Admin → Help** lists all conversations (filter AI / admin). Open a thread to read the full trace. Reply on **admin** threads; AI threads are read-only in the dashboard.
