from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    secret_key: str = "change-me-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent / 'data' / 'limiter.db'}"
    scheduler_timezone: str = "UTC"
    
    # Redis configuration
    redis_url: str = "redis://localhost:6379/0"
    redis_decode_responses: bool = False  # Keep bytes for Lua scripts
    
    # Alert thresholds
    alert_error_rate_threshold: float = 0.3  # 30% error rate
    alert_429_rate_threshold: float = 0.3  # 30% 429 rate
    alert_window_minutes: int = 3  # Alert if threshold exceeded for 3 minutes

    model_config = SettingsConfigDict(env_prefix="LIMITER_", env_file=".env", extra="ignore")


settings = Settings()
