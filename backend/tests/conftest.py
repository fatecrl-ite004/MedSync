from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.seed import seed_database


@pytest.fixture(scope="session")
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    with factory() as session:
        seed_database(session)
    yield factory
    engine.dispose()


@pytest.fixture(scope="session")
def client(session_factory) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    test_client.close()
    app.dependency_overrides.clear()


def login_headers(client: TestClient, email: str, password: str = "demo123") -> dict[str, str]:
    response = client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def patient_headers(client: TestClient) -> dict[str, str]:
    return login_headers(client, "paciente@medsync.test")


@pytest.fixture
def professional_headers(client: TestClient) -> dict[str, str]:
    return login_headers(client, "medico@medsync.test")


@pytest.fixture
def admin_headers(client: TestClient) -> dict[str, str]:
    return login_headers(client, "admin@medsync.test")
