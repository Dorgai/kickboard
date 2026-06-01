from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

from fastapi.testclient import TestClient

from app.main import app


def test_health_check_reports_database_reachable() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "reachable"}


def test_waitlist_signup_and_duplicate_detection() -> None:
    with TestClient(app) as client:
        before = client.get("/api/waitlist/summary").json()["count"]

        response = client.post(
            "/api/waitlist",
            json={
                "email": "Rider@Example.com",
                "name": "Rider",
                "message": "Tell me when Kickboard launches.",
            },
        )
        duplicate = client.post(
            "/api/waitlist",
            json={"email": "rider@example.com", "name": "Rider"},
        )
        after = client.get("/api/waitlist/summary").json()["count"]

    assert response.status_code == 201
    assert response.json()["email"] == "rider@example.com"
    assert duplicate.status_code == 409
    assert after == before + 1


def test_waitlist_rejects_invalid_email() -> None:
    with TestClient(app) as client:
        response = client.post("/api/waitlist", json={"email": "not-an-email"})

    assert response.status_code == 422
