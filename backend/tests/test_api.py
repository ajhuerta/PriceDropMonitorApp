"""
Tests for FastAPI endpoints — uses an in-memory SQLite DB via dependency override.
Scheduler and create_tables are mocked so tests stay fast and side-effect free.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # ensures ORM models are registered with Base
from database import Base, get_db
from main import app

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture
def client():
    # StaticPool ensures all sessions share the same in-memory DB connection
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with patch("main.create_tables"), patch("main.start_scheduler"), patch("main.stop_scheduler"):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


_ITEM_PAYLOAD = {
    "name": "Widget",
    "url": "https://amazon.com/dp/B001",
    "target_price": 29.99,
    "check_interval_minutes": 60,
}


def test_get_items_empty(client):
    resp = client.get("/items/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_item_returns_201_with_null_price(client):
    resp = client.post("/items/", json=_ITEM_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Widget"
    assert data["target_price"] == 29.99
    assert data["current_price"] is None
    assert data["last_scraped_at"] is None
    assert data["active"] is True


def test_created_item_appears_in_list(client):
    client.post("/items/", json=_ITEM_PAYLOAD)
    resp = client.get("/items/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_delete_item_removes_it(client):
    item_id = client.post("/items/", json=_ITEM_PAYLOAD).json()["id"]
    resp = client.delete(f"/items/{item_id}")
    assert resp.status_code == 204
    assert client.get("/items/").json() == []


def test_delete_nonexistent_item_returns_404(client):
    resp = client.delete("/items/9999")
    assert resp.status_code == 404
