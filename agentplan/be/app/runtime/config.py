from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    Runtime configuration loaded from environment variables or .env files.
    """

    allowed_origins: List[str] = ["http://localhost:5173", "http://localhost:4173"]
    openai_api_url: Optional[str] = Field(default=None)
    openai_api_key: Optional[str] = Field(default=None)
    openai_api_model: Optional[str] = Field(default=None)

    model_config = SettingsConfigDict(env_prefix="AGENTPLAN_", env_file=".env", env_file_encoding="utf-8")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
