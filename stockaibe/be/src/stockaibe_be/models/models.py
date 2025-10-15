from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class TimestampMixin(SQLModel):
    """Mixin for created_at and updated_at timestamps."""
    created_at: dt.datetime = Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: dt.datetime = Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc),
        nullable=False,
        sa_column_kwargs={
            "server_default": "CURRENT_TIMESTAMP",
            "onupdate": dt.datetime.now(dt.timezone.utc)
        }
    )


class User(TimestampMixin, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    username: str = Field(max_length=50, unique=True, index=True)
    hashed_password: str = Field(max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)


class Quota(TimestampMixin, table=True):
    __tablename__ = "quotas"

    id: str = Field(primary_key=True, max_length=100)
    domain: Optional[str] = Field(default=None, max_length=100)
    endpoint: Optional[str] = Field(default=None, max_length=255)
    algo: str = Field(default="token_bucket", max_length=50)
    capacity: int = Field(default=60)
    refill_rate: float = Field(default=1.0)
    leak_rate: Optional[float] = Field(default=None)
    burst: Optional[int] = Field(default=None)
    enabled: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, sa_column_kwargs={"type_": "TEXT"})

    # Relationships
    metrics: list["Metric"] = Relationship(back_populates="quota")
    traces: list["TraceLog"] = Relationship(back_populates="quota")


class Metric(SQLModel, table=True):
    __tablename__ = "metrics"

    id: Optional[int] = Field(default=None, primary_key=True)
    ts: dt.datetime = Field(index=True)
    quota_id: str = Field(foreign_key="quotas.id", index=True)
    ok: int = Field(default=0)
    err: int = Field(default=0)
    r429: int = Field(default=0)
    latency_p95: Optional[float] = Field(default=None)
    tokens_remain: Optional[float] = Field(default=None)

    # Relationship
    quota: Optional["Quota"] = Relationship(back_populates="metrics")


class TraceLog(TimestampMixin, table=True):
    __tablename__ = "traces"

    id: Optional[int] = Field(default=None, primary_key=True)
    quota_id: str = Field(foreign_key="quotas.id", index=True)
    status_code: int
    latency_ms: Optional[float] = Field(default=None)
    message: Optional[str] = Field(default=None, sa_column_kwargs={"type_": "TEXT"})

    # Relationship
    quota: Optional["Quota"] = Relationship(back_populates="traces")


class SchedulerTask(TimestampMixin, table=True):
    __tablename__ = "scheduler_tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: str = Field(unique=True, index=True, max_length=100)
    name: str = Field(max_length=100)
    cron: Optional[str] = Field(default=None, max_length=100)
    func_path: str = Field(max_length=255)
    args: Optional[str] = Field(default=None, sa_column_kwargs={"type_": "TEXT"})
    kwargs: Optional[str] = Field(default=None, sa_column_kwargs={"type_": "TEXT"})
    is_active: bool = Field(default=True)
    last_run_at: Optional[dt.datetime] = Field(default=None)
