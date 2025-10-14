from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: dt.datetime.now(dt.timezone.utc)
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)


class Quota(Base, TimestampMixin):
    __tablename__ = "quotas"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    domain: Mapped[Optional[str]] = mapped_column(String(100))
    endpoint: Mapped[Optional[str]] = mapped_column(String(255))
    algo: Mapped[str] = mapped_column(String(50), default="token_bucket")
    capacity: Mapped[int] = mapped_column(Integer, default=60)
    refill_rate: Mapped[float] = mapped_column(Float, default=1.0)
    leak_rate: Mapped[Optional[float]] = mapped_column(Float)
    burst: Mapped[Optional[int]] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    metrics: Mapped[list[Metric]] = relationship("Metric", back_populates="quota")
    traces: Mapped[list[TraceLog]] = relationship("TraceLog", back_populates="quota")


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), index=True)
    quota_id: Mapped[str] = mapped_column(ForeignKey("quotas.id"), index=True)
    ok: Mapped[int] = mapped_column(Integer, default=0)
    err: Mapped[int] = mapped_column(Integer, default=0)
    r429: Mapped[int] = mapped_column(Integer, default=0)
    latency_p95: Mapped[Optional[float]] = mapped_column(Float)
    tokens_remain: Mapped[Optional[float]] = mapped_column(Float)

    quota: Mapped[Quota] = relationship("Quota", back_populates="metrics")


class TraceLog(Base, TimestampMixin):
    __tablename__ = "traces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quota_id: Mapped[str] = mapped_column(ForeignKey("quotas.id"), index=True)
    status_code: Mapped[int] = mapped_column(Integer)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float)
    message: Mapped[Optional[str]] = mapped_column(Text)

    quota: Mapped[Quota] = relationship("Quota", back_populates="traces")


class SchedulerTask(Base, TimestampMixin):
    __tablename__ = "scheduler_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    cron: Mapped[Optional[str]] = mapped_column(String(100))
    func_path: Mapped[str] = mapped_column(String(255))
    args: Mapped[Optional[str]] = mapped_column(Text)
    kwargs: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True))
