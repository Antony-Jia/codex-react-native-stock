from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    secret_key: str = "change-me-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    database_url: str = "postgresql://stockai:stockai_password@localhost:5432/stockai_limiter"
    scheduler_timezone: str = "Asia/Shanghai"
    
    # Redis configuration
    redis_url: str = "redis://localhost:6379/0"
    redis_decode_responses: bool = False  # Keep bytes for Lua scripts
    
    # Alert thresholds
    alert_error_rate_threshold: float = 0.3  # 30% error rate
    alert_429_rate_threshold: float = 0.3  # 30% 429 rate
    alert_window_minutes: int = 3  # Alert if threshold exceeded for 3 minutes

    model_config = SettingsConfigDict(env_prefix="LIMITER_", env_file=".env", extra="ignore")


settings = Settings()
