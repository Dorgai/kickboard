from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _normalize_database_url(url: str) -> str:
    """SQLAlchemy expects the postgresql:// scheme for Postgres URLs."""
    if url.startswith("postgres://"):
        return "postgresql://" + url.removeprefix("postgres://")
    return url


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str
    database_url: str
    cors_origins: list[str]


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "Kickboard"),
        database_url=_normalize_database_url(
            os.getenv("DATABASE_URL", "sqlite+pysqlite:///./kickboard.db")
        ),
        cors_origins=_parse_csv(os.getenv("CORS_ORIGINS")),
    )
