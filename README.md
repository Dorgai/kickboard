# Kickboard

Railway-ready FastAPI starter for the Kickboard app.

The product spec attachment was not present in this repository snapshot, so this
commit keeps the app intentionally small: a landing page, API docs, a database
health check, and a Postgres-backed waitlist endpoint. The domain-specific
screens, models, and workflows can be added once the spec is available.

## What is included

- FastAPI app served by Uvicorn
- SQLAlchemy database layer using `DATABASE_URL`
- Local SQLite fallback for development
- Railway deploy config with `/api/health` health check
- Waitlist API that proves database writes are working
- Pytest coverage for health and waitlist behavior

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Open:

- App landing page: <http://localhost:8000>
- API docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/health>

## Test

```bash
pytest
```

## Environment variables

Copy `.env.example` to `.env` for local development.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Railway: yes | Postgres connection string. Defaults to local SQLite when unset. |
| `APP_NAME` | No | Display/API title. Defaults to `Kickboard`. |
| `CORS_ORIGINS` | No | Comma-separated browser origins allowed to call the API. |

See [RAILWAY.md](RAILWAY.md) for the Railway project setup checklist.
