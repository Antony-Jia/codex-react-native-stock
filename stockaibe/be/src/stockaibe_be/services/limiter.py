from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Dict

from sqlalchemy.orm import Session

from ..models import Metric, Quota, TraceLog


@dataclass
class BucketState:
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
    states: Dict[str, BucketState] = field(default_factory=dict)

    def ensure_quota(self, quota: Quota) -> None:
        now = dt.datetime.now(dt.timezone.utc)
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

    def remove_quota(self, quota_id: str) -> None:
        self.states.pop(quota_id, None)

    def acquire(
        self,
        db: Session,
        quota: Quota,
        cost: int,
        success: bool,
        latency_ms: float | None = None,
        message: str | None = None,
    ) -> tuple[bool, float]:
        now = dt.datetime.now(dt.timezone.utc)
        self.ensure_quota(quota)
        state = self.states[quota.id]
        allowed = quota.enabled and state.acquire(cost, now)
        remain = state.tokens

        trace = TraceLog(
            quota_id=quota.id,
            status_code=200 if allowed and success else 429 if not allowed else 500,
            latency_ms=latency_ms,
            message=message,
        )
        db.add(trace)

        metric = Metric(
            ts=now,
            quota_id=quota.id,
            ok=1 if allowed and success else 0,
            err=1 if allowed and not success else 0,
            r429=0 if allowed else 1,
            latency_p95=latency_ms,
            tokens_remain=remain,
        )
        db.add(metric)
        return allowed, remain


limiter_service = LimiterService()
