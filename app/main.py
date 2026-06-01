from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_session, init_db
from app.models import WaitlistEntry
from app.schemas import WaitlistCreate, WaitlistEntryRead, WaitlistSummary


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def landing_page() -> str:
    return """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Kickboard</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 0; background: #111827; color: #f9fafb; }
          main { max-width: 720px; margin: 0 auto; padding: 6rem 1.5rem; }
          .card { background: #1f2937; border: 1px solid #374151; border-radius: 1rem; padding: 2rem; }
          a { color: #93c5fd; }
          code { background: #111827; border-radius: 0.25rem; padding: 0.15rem 0.35rem; }
        </style>
      </head>
      <body>
        <main>
          <section class="card">
            <h1>Kickboard is ready for specs.</h1>
            <p>
              This Railway-ready starter includes a database health check and
              waitlist API while the detailed product spec is added.
            </p>
            <p>Try <code>/api/health</code> or view API docs at <a href="/docs">/docs</a>.</p>
          </section>
        </main>
      </body>
    </html>
    """


@app.get("/api/health")
def health(session: Session = Depends(get_session)) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}


@app.post(
    "/api/waitlist",
    response_model=WaitlistEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def join_waitlist(
    payload: WaitlistCreate, session: Session = Depends(get_session)
) -> WaitlistEntry:
    entry = WaitlistEntry(
        email=payload.email,
        name=payload.name,
        message=payload.message,
    )
    session.add(entry)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already on the waitlist.",
        ) from exc
    session.refresh(entry)
    return entry


@app.get("/api/waitlist/summary", response_model=WaitlistSummary)
def waitlist_summary(session: Session = Depends(get_session)) -> WaitlistSummary:
    count = session.scalar(select(func.count()).select_from(WaitlistEntry)) or 0
    return WaitlistSummary(count=count)
