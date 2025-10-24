from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Runtime configuration loaded from environment variables or .env files.
    """

    allowed_origins: List[str] = ["http://localhost:5173", "http://localhost:4173"]

    model_config = SettingsConfigDict(env_prefix="AGENTPLAN_", env_file=".env", env_file_encoding="utf-8")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

