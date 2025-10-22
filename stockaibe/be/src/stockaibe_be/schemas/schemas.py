from __future__ import annotations

import datetime as dt
from typing import Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    """通用分页响应"""
    items: List[T]
    total: int
    page: int = 1
    page_size: int = 20


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


class ShanghaiAStockBase(BaseModel):
    code: str
    name: str
    short_name: Optional[str] = None
    industry: Optional[str] = None
    exchange: str = "SH"
    is_active: bool = True
    listing_date: Optional[dt.date] = None


class ShanghaiAStockCreate(ShanghaiAStockBase):
    pass


class ShanghaiAStockUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    industry: Optional[str] = None
    exchange: Optional[str] = None
    is_active: Optional[bool] = None
    listing_date: Optional[dt.date] = None


class ShanghaiAStockRead(ShanghaiAStockBase):
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}


class ShanghaiAStockInfoRead(BaseModel):
    stock_code: str
    info_key: str
    info_value: Optional[str] = None
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}


class ShanghaiAMarketFundFlowRead(BaseModel):
    trade_date: dt.date
    shanghai_close: Optional[float] = None
    shanghai_pct_change: Optional[float] = None
    shenzhen_close: Optional[float] = None
    shenzhen_pct_change: Optional[float] = None
    main_net_inflow: Optional[float] = None
    main_net_ratio: Optional[float] = None
    super_large_net_inflow: Optional[float] = None
    super_large_net_ratio: Optional[float] = None
    large_net_inflow: Optional[float] = None
    large_net_ratio: Optional[float] = None
    medium_net_inflow: Optional[float] = None
    medium_net_ratio: Optional[float] = None
    small_net_inflow: Optional[float] = None
    small_net_ratio: Optional[float] = None

    model_config = {"from_attributes": True}


class ShanghaiAStockFundFlowRead(BaseModel):
    stock_code: str
    stock_name: Optional[str] = None
    trade_date: dt.date
    latest_price: Optional[float] = None
    pct_change: Optional[float] = None
    turnover_rate: Optional[float] = None
    inflow: Optional[float] = None
    outflow: Optional[float] = None
    net_inflow: Optional[float] = None
    amount: Optional[float] = None


class ShanghaiAStockBalanceSheetRead(BaseModel):
    stock_code: str
    report_period: dt.date
    announcement_date: Optional[dt.date] = None
    currency_funds: Optional[float] = None
    accounts_receivable: Optional[float] = None
    inventory: Optional[float] = None
    total_assets: Optional[float] = None
    total_assets_yoy: Optional[float] = None
    accounts_payable: Optional[float] = None
    advance_receipts: Optional[float] = None
    total_liabilities: Optional[float] = None
    total_liabilities_yoy: Optional[float] = None
    debt_to_asset_ratio: Optional[float] = None
    total_equity: Optional[float] = None
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}


class ShanghaiAStockBalanceSheetSummary(ShanghaiAStockBalanceSheetRead):
    stock_name: Optional[str] = None
    short_name: Optional[str] = None


class ShanghaiAStockPerformanceRead(BaseModel):
    stock_code: str
    report_period: dt.date
    announcement_date: Optional[dt.date] = None
    eps: Optional[float] = None
    revenue: Optional[float] = None
    revenue_yoy: Optional[float] = None
    revenue_qoq: Optional[float] = None
    net_profit: Optional[float] = None
    net_profit_yoy: Optional[float] = None
    net_profit_qoq: Optional[float] = None
    bps: Optional[float] = None
    roe: Optional[float] = None
    operating_cash_flow_ps: Optional[float] = None
    gross_margin: Optional[float] = None
    industry: Optional[str] = None
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}


class ShanghaiAStockPerformanceSummary(ShanghaiAStockPerformanceRead):
    stock_name: Optional[str] = None
    short_name: Optional[str] = None


class ShanghaiAManualUpdateRequest(BaseModel):
    trade_date: Optional[dt.date] = None
    stock_codes: Optional[List[str]] = None


class ShanghaiAManualUpdateResponse(BaseModel):
    message: str
    summary: Dict[str, int]


class ShanghaiAFinancialCollectRequest(BaseModel):
    start_period: dt.date
    end_period: Optional[dt.date] = None
    include_balance_sheet: bool = True
    include_performance: bool = True


class ShanghaiAFinancialCollectResponse(BaseModel):
    message: str
    quarters_processed: List[str]
    balance_sheet_rows: int
    balance_sheet_stocks: int
    performance_rows: int
    performance_stocks: int


class ShanghaiACompanyNewsRead(BaseModel):
    id: int
    code: str
    name: str
    event_type: str
    specific_matters: str
    trade_date: dt.date
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class ShanghaiAStockBidAskItem(BaseModel):
    """实时行情报价单项数据"""
    item: str
    value: Optional[float] = None


class ShanghaiAStockBidAskResponse(BaseModel):
    """实时行情报价响应"""
    symbol: str
    items: List[ShanghaiAStockBidAskItem]
