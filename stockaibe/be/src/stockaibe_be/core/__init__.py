"""Core module for configuration, database, and security."""

from .config import settings
from .database import engine, get_session, session_scope
from .redis_client import get_redis, close_redis
from .security import (
    create_access_token,
    decode_token,
    get_current_active_superuser,
    get_current_user,
    get_db,
    get_password_hash,
    verify_password,
)
from .logging_config import setup_logging, get_logger

__all__ = [
    "settings",
    "engine",
    "get_session",
    "session_scope",
    "get_db",
    "get_redis",
    "close_redis",
    "create_access_token",
    "decode_token",
    "get_current_active_superuser",
    "get_current_user",
    "get_password_hash",
    "verify_password",
    "setup_logging",
    "get_logger",
]
