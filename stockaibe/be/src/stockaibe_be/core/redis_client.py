"""Redis client configuration and connection management."""

import redis
from typing import Optional

from .config import settings

_redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    """Get Redis client instance (singleton)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=settings.redis_decode_responses,
            socket_connect_timeout=5,
            socket_keepalive=True,
            health_check_interval=30,
        )
    return _redis_client


def close_redis() -> None:
    """Close Redis connection."""
    global _redis_client
    if _redis_client is not None:
        _redis_client.close()
        _redis_client = None
