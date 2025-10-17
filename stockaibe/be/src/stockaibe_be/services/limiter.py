"""Rate limiter service with Redis + Lua script implementation."""

from __future__ import annotations

import datetime as dt
import time
from dataclasses import dataclass, field
from typing import Dict, Optional

import redis
from sqlalchemy.orm import Session

from ..core import get_redis, get_logger
from ..models import Metric, Quota, TraceLog

# 获取日志记录器
logger = get_logger(__name__)


# Lua script for token bucket rate limiting with atomic operations
LUA_TOKEN_BUCKET_SCRIPT = """
local quota_key = KEYS[1]
local stats_key = KEYS[2]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill_rate = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

-- Get current tokens and last refill time
local tokens = tonumber(redis.call('GET', quota_key .. ':tokens')) or capacity
local last_refill = tonumber(redis.call('GET', quota_key .. ':last_refill')) or now

-- Calculate refill
local elapsed = now - last_refill
local added = elapsed * refill_rate
tokens = math.min(capacity, tokens + added)

-- Try to acquire
local allowed = 0
if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
end

-- Update Redis
redis.call('SET', quota_key .. ':tokens', tokens)
redis.call('SET', quota_key .. ':last_refill', now)

-- Return: allowed (0/1), remaining tokens
return {allowed, tokens}
"""


@dataclass
class BucketState:
    """In-memory bucket state for fallback when Redis is unavailable."""
    tokens: float
    last_refill: dt.datetime
    capacity: int
    refill_rate: float
    leak_rate: float | None = None

    def refill(self, now: dt.datetime) -> None:
        if self.leak_rate and self.leak_rate > 0:
            elapsed = (now - self.last_refill).total_seconds()
            leaked = elapsed * self.leak_rate
            self.tokens = max(0.0, self.tokens - leaked)
        if self.refill_rate > 0:
            elapsed = (now - self.last_refill).total_seconds()
            added = elapsed * self.refill_rate
            self.tokens = min(self.capacity, self.tokens + added)
        self.last_refill = now

    def acquire(self, cost: int, now: dt.datetime) -> bool:
        self.refill(now)
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


@dataclass
class LimiterService:
    """Rate limiter service with Redis + Lua script support."""
    states: Dict[str, BucketState] = field(default_factory=dict)
    _redis: Optional[redis.Redis] = None
    _lua_sha: Optional[str] = None
    _use_redis: bool = True

    def _get_redis(self) -> Optional[redis.Redis]:
        """Get Redis client, cache it, and handle connection errors."""
        if not self._use_redis:
            return None
        if self._redis is None:
            try:
                self._redis = get_redis()
                # Load Lua script
                self._lua_sha = self._redis.script_load(LUA_TOKEN_BUCKET_SCRIPT)
                logger.info("Redis 连接成功，Lua 脚本已加载")
            except Exception as e:
                logger.warning(f"Redis 连接失败，回退到内存模式: {e}")
                self._use_redis = False
                return None
        return self._redis

    def ensure_quota(self, quota: Quota) -> None:
        """Ensure quota is initialized in Redis or memory."""
        now = dt.datetime.now(dt.timezone.utc)
        
        # Always maintain memory state as fallback
        if quota.id not in self.states:
            self.states[quota.id] = BucketState(
                tokens=float(quota.capacity),
                last_refill=now,
                capacity=quota.capacity,
                refill_rate=quota.refill_rate,
                leak_rate=quota.leak_rate,
            )
        else:
            state = self.states[quota.id]
            state.capacity = quota.capacity
            state.refill_rate = quota.refill_rate
            state.leak_rate = quota.leak_rate
            state.tokens = min(state.tokens, quota.capacity)
        
        # Initialize Redis if available
        r = self._get_redis()
        if r:
            try:
                quota_key = f"quota:{quota.id}"
                if not r.exists(f"{quota_key}:tokens"):
                    r.set(f"{quota_key}:tokens", quota.capacity)
                    r.set(f"{quota_key}:last_refill", time.time())
                    logger.debug(f"Redis 中初始化配额: {quota.id}")
            except Exception as e:
                logger.error(f"Redis 初始化配额失败 {quota.id}: {e}")

    def remove_quota(self, quota_id: str) -> None:
        """Remove quota from memory and Redis."""
        self.states.pop(quota_id, None)
        r = self._get_redis()
        if r:
            try:
                quota_key = f"quota:{quota_id}"
                r.delete(f"{quota_key}:tokens", f"{quota_key}:last_refill")
            except Exception:
                pass

    def _acquire_redis(
        self, quota: Quota, cost: int
    ) -> tuple[bool, float]:
        """Acquire tokens using Redis + Lua script."""
        r = self._get_redis()
        if not r or not self._lua_sha:
            raise RuntimeError("Redis not available")
        
        quota_key = f"quota:{quota.id}"
        minute_key = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d%H%M")
        stats_key = f"stats:{quota.id}:{minute_key}"
        
        now = time.time()
        result = r.evalsha(
            self._lua_sha,
            2,  # number of keys
            quota_key,
            stats_key,
            now,
            quota.capacity,
            quota.refill_rate,
            cost,
        )
        
        allowed = bool(result[0])
        remain = float(result[1])
        return allowed, remain

    def _acquire_memory(
        self, quota: Quota, cost: int
    ) -> tuple[bool, float]:
        """Acquire tokens using in-memory state (fallback)."""
        now = dt.datetime.now(dt.timezone.utc)
        self.ensure_quota(quota)
        state = self.states[quota.id]
        allowed = state.acquire(cost, now)
        remain = state.tokens
        return allowed, remain

    def acquire(
        self,
        db: Session,
        quota: Quota,
        cost: int,
        success: bool,
        latency_ms: float | None = None,
        message: str | None = None,
        func_id: str | None = None,
        func_name: str | None = None,
    ) -> tuple[bool, float]:
        """Acquire tokens with rate limiting."""
        now = dt.datetime.now(dt.timezone.utc)
        
        # Try Redis first, fallback to memory
        try:
            if self._use_redis:
                allowed, remain = self._acquire_redis(quota, cost)
            else:
                allowed, remain = self._acquire_memory(quota, cost)
        except Exception as e:
            print(f"Acquire failed, using memory fallback: {e}")
            self._use_redis = False
            allowed, remain = self._acquire_memory(quota, cost)
        
        # Apply enabled check
        if not quota.enabled:
            allowed = False
        
        # Record trace
        trace = TraceLog(
            quota_id=quota.id,
            func_id=func_id,
            func_name=func_name,
            status_code=200 if allowed and success else 429 if not allowed else 500,
            latency_ms=latency_ms,
            message=message,
        )
        db.add(trace)
        
        # Update stats in Redis
        r = self._get_redis()
        if r:
            try:
                minute_key = now.strftime("%Y%m%d%H%M")
                stats_key = f"stats:{quota.id}:{minute_key}"
                pipe = r.pipeline()
                if allowed and success:
                    pipe.hincrby(stats_key, "ok", 1)
                elif allowed and not success:
                    pipe.hincrby(stats_key, "err", 1)
                else:
                    pipe.hincrby(stats_key, "r429", 1)
                if latency_ms:
                    pipe.hincrbyfloat(stats_key, "latency_sum", latency_ms)
                    pipe.hincrby(stats_key, "latency_count", 1)
                pipe.expire(stats_key, 3600)  # Keep for 1 hour
                pipe.execute()
            except Exception as e:
                print(f"Failed to update Redis stats: {e}")
        
        return allowed, remain
    
    def get_current_tokens(self, quota_id: str) -> Optional[float]:
        """Get current token count for a quota with refill calculation."""
        r = self._get_redis()
        if r:
            try:
                quota_key = f"quota:{quota_id}"
                tokens = r.get(f"{quota_key}:tokens")
                last_refill = r.get(f"{quota_key}:last_refill")
                
                if tokens is not None and last_refill is not None:
                    # Get quota config from memory state
                    state = self.states.get(quota_id)
                    if state:
                        # Calculate refill
                        now = time.time()
                        elapsed = now - float(last_refill)
                        added = elapsed * state.refill_rate
                        current_tokens = min(state.capacity, float(tokens) + added)
                        
                        # Update Redis with new values
                        r.set(f"{quota_key}:tokens", current_tokens)
                        r.set(f"{quota_key}:last_refill", now)
                        
                        return current_tokens
                    else:
                        # No state info, just return stored value
                        return float(tokens)
            except Exception as e:
                logger.error(f"获取令牌数失败 {quota_id}: {e}")
        
        # Fallback to memory
        state = self.states.get(quota_id)
        if state:
            now = dt.datetime.now(dt.timezone.utc)
            state.refill(now)
            return state.tokens
        return None


limiter_service = LimiterService()
