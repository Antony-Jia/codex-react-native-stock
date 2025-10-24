from __future__ import annotations

from functools import lru_cache
import os
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
    openai_timeout: Optional[int] = Field(default=60, description="Timeout in seconds for OpenAI API calls.")

    model_config = SettingsConfigDict(env_prefix="AGENTPLAN_", env_file=".env", env_file_encoding="utf-8")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()

    fallback_key = os.getenv("OPENAI_API_KEY")
    fallback_model = os.getenv("OPENAI_API_MODEL")
    fallback_url = os.getenv("OPENAI_API_URL")
    fallback_timeout = os.getenv("OPENAI_TIMEOUT") or os.getenv("OPENAI_API_TIMEOUT")

    if not settings.openai_api_key and fallback_key:
        settings.openai_api_key = fallback_key
    if not settings.openai_api_model and fallback_model:
        settings.openai_api_model = fallback_model
    if not settings.openai_api_url and fallback_url:
        settings.openai_api_url = fallback_url
    if fallback_timeout and not settings.openai_timeout:
        try:
            settings.openai_timeout = int(fallback_timeout)
        except ValueError:
            pass

    return settings
