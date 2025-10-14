from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    secret_key: str = "change-me-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent / 'data' / 'limiter.db'}"
    scheduler_timezone: str = "UTC"

    model_config = SettingsConfigDict(env_prefix="LIMITER_", env_file=".env", extra="ignore")


settings = Settings()
