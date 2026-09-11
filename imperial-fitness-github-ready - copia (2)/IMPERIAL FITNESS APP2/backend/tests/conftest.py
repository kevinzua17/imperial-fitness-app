import os
from pathlib import Path


TEST_DB = Path(__file__).resolve().parent / "test_imperial_fitness.db"
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["SECRET_KEY"] = "test-secret-key-for-imperial-fitness"
os.environ["CORS_ORIGINS"] = "http://localhost:5173,http://localhost:8000"
os.environ["TRUSTED_HOSTS"] = "testserver,localhost,127.0.0.1"
os.environ["RATE_LIMIT_ENABLED"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import run as seed_database


@pytest.fixture(scope="session", autouse=True)
def seed_test_database():
    seed_database()
    yield


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client