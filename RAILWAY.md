# Railway setup

This app can run as a single Railway web service plus a managed Postgres
database.

## Services to add

1. **Web service**
   - Source: this GitHub repository.
   - Builder: Nixpacks.
   - Start command is defined in `railway.json`:
     `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
   - Health check path: `/api/health`.

2. **PostgreSQL database**
   - Add Railway's PostgreSQL plugin/service to the same project.
   - Railway will expose a `DATABASE_URL` variable for the web service.
   - The app creates its starter table on boot. For larger product-specific
     schemas, add migrations before launch.

## Variables to configure

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Railway Postgres | Required in Railway. Link the Postgres service to the web service so this is injected automatically. |
| `APP_NAME` | Manual | Optional. Defaults to `Kickboard`. |
| `CORS_ORIGINS` | Manual | Optional until a separate frontend or custom domain calls the API from browsers. Use comma-separated origins, e.g. `https://kickboard.app,https://www.kickboard.app`. |

Railway also provides `PORT`; do not set it manually.

## Custom domain and frontend notes

- If the FastAPI service serves the only user-facing UI, one web service and
  Postgres are enough.
- If the product spec calls for a separate frontend app, add a second Railway
  web service for that frontend and set `CORS_ORIGINS` on the API to the
  frontend domain.
- Add a custom domain in Railway once DNS is ready.

## Deployment checklist

1. Create a Railway project from this repository.
2. Add a PostgreSQL service.
3. Link the Postgres variables to the web service.
4. Set optional `APP_NAME` and `CORS_ORIGINS`.
5. Deploy and confirm `/api/health` returns:

   ```json
   {"status":"ok","database":"reachable"}
   ```

6. Open `/docs` to verify the API is available.
