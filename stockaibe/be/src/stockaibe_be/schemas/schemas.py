from __future__ import annotations

import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: int


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    
    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str


class QuotaBase(BaseModel):
    id: str
    name: Optional[str] = None
    domain: Optional[str] = None
    endpoint: Optional[str] = None
    algo: str = "token_bucket"
    capacity: int = 60
    refill_rate: float = 1.0
    leak_rate: Optional[float] = None
    burst: Optional[int] = None
    enabled: bool = True
    notes: Optional[str] = None


class QuotaCreate(QuotaBase):
    pass


class QuotaUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    endpoint: Optional[str] = None
    algo: Optional[str] = None
    capacity: Optional[int] = None
    refill_rate: Optional[float] = None
    leak_rate: Optional[float] = None
    burst: Optional[int] = None
    enabled: Optional[bool] = None
    notes: Optional[str] = None


class QuotaRead(QuotaBase):
    created_at: dt.datetime
    updated_at: dt.datetime
    current_tokens: Optional[float] = None
    
    model_config = {"from_attributes": True}


class AcquireRequest(BaseModel):
    qid: str
    cost: int = 1
    latency_ms: Optional[float] = None
    success: bool = True
    message: Optional[str] = None


class AcquireResponse(BaseModel):
    allow: bool
    remain: float


class MetricSeriesPoint(BaseModel):
    ts: dt.datetime
    quota_id: str
    ok: int
    err: int
    r429: int
    latency_p95: Optional[float]
    tokens_remain: Optional[float]


class MetricsSeriesResponse(BaseModel):
    items: list[MetricSeriesPoint]


class MetricsCurrentResponse(BaseModel):
    quota_id: str
    ok: int
    err: int
    r429: int
    tokens_remain: Optional[float]


class TraceRead(BaseModel):
    id: int
    quota_id: str
    func_id: Optional[str] = None
    func_name: Optional[str] = None
    status_code: int
    latency_ms: Optional[float]
    message: Optional[str]
    created_at: dt.datetime


class TaskCreate(BaseModel):
    name: str
    cron: str = Field(..., description="Cron expression for APScheduler")


class TaskRead(BaseModel):
    job_id: str
    name: str
    cron: Optional[str]
    next_run: Optional[dt.datetime]
    is_active: bool
    description: Optional[str]


class TaskTriggerRequest(BaseModel):
    job_id: str


class FuncStatsRead(BaseModel):
    """限流函数调用统计"""
    func_id: str
    func_name: Optional[str]
    quota_id: str
    total_calls: int
    success_calls: int  # status_code = 200
    failed_calls: int  # status_code = 500
    limited_calls: int  # status_code = 429
    avg_latency_ms: Optional[float]
    last_call_at: Optional[dt.datetime]
