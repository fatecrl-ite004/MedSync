from __future__ import annotations

import os
from dataclasses import dataclass


def _cors_origins() -> tuple[str, ...]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./medsync.db")
    secret_key: str = os.getenv(
        "SECRET_KEY", "medsync-development-secret-change-in-production"
    )
    token_expire_minutes: int = int(os.getenv("TOKEN_EXPIRE_MINUTES", "720"))
    app_timezone: str = os.getenv("APP_TIMEZONE", "America/Sao_Paulo")
    cors_origins: tuple[str, ...] = _cors_origins()
    seed_demo_data: bool = os.getenv("SEED_DEMO_DATA", "true").lower() not in {
        "0",
        "false",
        "no",
    }


settings = Settings()
