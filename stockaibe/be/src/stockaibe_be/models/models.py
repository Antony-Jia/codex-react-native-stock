from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlalchemy import Text, UniqueConstraint, text
from sqlmodel import Field, SQLModel, Column


class TimestampMixin(SQLModel):
    """Mixin for created_at and updated_at timestamps."""
    created_at: dt.datetime = Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": text("CURRENT_TIMESTAMP")}
    )
    updated_at: dt.datetime = Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": text("CURRENT_TIMESTAMP")}
    )


class User(TimestampMixin, table=True):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    username: str = Field(max_length=50, unique=True, index=True)
    hashed_password: str = Field(max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)


class Quota(TimestampMixin, table=True):
    __tablename__ = "quotas"
    __table_args__ = {"extend_existing": True}

    id: str = Field(primary_key=True, max_length=100)
    domain: Optional[str] = Field(default=None, max_length=100)
    name: Optional[str] = Field(default=None, max_length=100)
    endpoint: Optional[str] = Field(default=None, max_length=255)
    algo: str = Field(default="token_bucket", max_length=50)
    capacity: int = Field(default=60)
    refill_rate: float = Field(default=1.0)
    leak_rate: Optional[float] = Field(default=None)
    burst: Optional[int] = Field(default=None)
    enabled: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))


class Metric(SQLModel, table=True):
    __tablename__ = "metrics"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    ts: dt.datetime = Field(index=True)
    quota_id: str = Field(foreign_key="quotas.id", index=True)
    ok: int = Field(default=0)
    err: int = Field(default=0)
    r429: int = Field(default=0)
    latency_p95: Optional[float] = Field(default=None)
    tokens_remain: Optional[float] = Field(default=None)


class TraceLog(TimestampMixin, table=True):
    __tablename__ = "traces"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    quota_id: str = Field(foreign_key="quotas.id", index=True)
    func_id: Optional[str] = Field(default=None, max_length=100, index=True)  # 限流函数ID（LimitTask/LimitCallTask的id）
    func_name: Optional[str] = Field(default=None, max_length=100)  # 限流函数名称
    status_code: int
    latency_ms: Optional[float] = Field(default=None)
    message: Optional[str] = Field(default=None, sa_column=Column(Text))


class SchedulerTask(TimestampMixin, table=True):
    __tablename__ = "scheduler_tasks"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    job_id: str = Field(unique=True, index=True, max_length=100)
    name: str = Field(max_length=100)
    task_type: str = Field(default="scheduler", max_length=20)  # "scheduler" or "limiter"
    cron: Optional[str] = Field(default=None, max_length=100)
    quota_name: Optional[str] = Field(default=None, max_length=100)  # For limiter tasks
    func_path: str = Field(max_length=255)
    args: Optional[str] = Field(default=None, sa_column=Column(Text))
    kwargs: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_active: bool = Field(default=True)
    last_run_at: Optional[dt.datetime] = Field(default=None)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))


class ShanghaiAStock(TimestampMixin, table=True):
    """沪A股基础档案，维护需要抓取的股票列表。"""

    __tablename__ = "shanghai_a_stocks"
    __table_args__ = {"extend_existing": True}

    code: str = Field(primary_key=True, max_length=12, description="股票代码（不含市场前缀）")
    name: str = Field(max_length=100, index=True, description="股票名称")
    short_name: Optional[str] = Field(default=None, max_length=100, description="简称或拼音")
    industry: Optional[str] = Field(default=None, max_length=100, description="所属行业")
    exchange: str = Field(default="SH", max_length=10, description="交易所代码")
    is_active: bool = Field(default=True, description="是否参与批量采集")
    listing_date: Optional[dt.date] = Field(default=None, description="上市日期", index=True)


class ShanghaiAStockInfo(TimestampMixin, table=True):
    """沪A股个股信息（来自 stock_individual_info_em），按键值对存储。"""

    __tablename__ = "shanghai_a_stock_info"
    __table_args__ = (
        UniqueConstraint("stock_code", "info_key", name="uq_shanghai_a_stock_info"),
        {"extend_existing": True},
    )

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    stock_code: str = Field(foreign_key="shanghai_a_stocks.code", max_length=12, index=True)
    info_key: str = Field(max_length=100, index=True, description="信息项名称")
    info_value: Optional[str] = Field(default=None, sa_column=Column(Text), description="信息项值")


class ShanghaiAMarketFundFlow(TimestampMixin, table=True):
    """沪深市场整体资金流向概览。"""

    __tablename__ = "shanghai_a_market_fund_flow"
    __table_args__ = (
        UniqueConstraint("trade_date", name="uq_shanghai_a_market_fund_flow"),
        {"extend_existing": True},
    )

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    trade_date: dt.date = Field(index=True, description="统计日期")
    shanghai_close: Optional[float] = Field(default=None, description="上证指数收盘价")
    shanghai_pct_change: Optional[float] = Field(default=None, description="上证指数涨跌幅（%）")
    shenzhen_close: Optional[float] = Field(default=None, description="深证指数收盘价")
    shenzhen_pct_change: Optional[float] = Field(default=None, description="深证指数涨跌幅（%）")
    main_net_inflow: Optional[float] = Field(default=None, description="主力净流入（元）")
    main_net_ratio: Optional[float] = Field(default=None, description="主力净占比（%）")
    super_large_net_inflow: Optional[float] = Field(default=None, description="超大单净流入（元）")
    super_large_net_ratio: Optional[float] = Field(default=None, description="超大单净占比（%）")
    large_net_inflow: Optional[float] = Field(default=None, description="大单净流入（元）")
    large_net_ratio: Optional[float] = Field(default=None, description="大单净占比（%）")
    medium_net_inflow: Optional[float] = Field(default=None, description="中单净流入（元）")
    medium_net_ratio: Optional[float] = Field(default=None, description="中单净占比（%）")
    small_net_inflow: Optional[float] = Field(default=None, description="小单净流入（元）")
    small_net_ratio: Optional[float] = Field(default=None, description="小单净占比（%）")


class ShanghaiAStockFundFlow(TimestampMixin, table=True):
    """沪A股个股资金流向数据。"""

    __tablename__ = "shanghai_a_stock_fund_flow"
    __table_args__ = (
        UniqueConstraint("stock_code", "trade_date", name="uq_shanghai_a_stock_fund_flow"),
        {"extend_existing": True},
    )

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    stock_code: str = Field(foreign_key="shanghai_a_stocks.code", max_length=12, index=True)
    trade_date: dt.date = Field(index=True, description="统计日期")
    latest_price: Optional[float] = Field(default=None, description="最新价")
    pct_change: Optional[float] = Field(default=None, description="涨跌幅（%）")
    turnover_rate: Optional[float] = Field(default=None, description="换手率（%）")
    inflow: Optional[float] = Field(default=None, description="流入资金（元）")
    outflow: Optional[float] = Field(default=None, description="流出资金（元）")
    net_inflow: Optional[float] = Field(default=None, description="净流入资金（元）")
    amount: Optional[float] = Field(default=None, description="成交额（元）")

class ShanghaiAStockBalanceSheet(TimestampMixin, table=True):
    """Quarterly balance sheet snapshot for Shanghai A stocks."""

    __tablename__ = "shanghai_a_stock_balance_sheet"
    __table_args__ = (
        UniqueConstraint("stock_code", "report_period", name="uq_shanghai_a_balance_sheet"),
        {"extend_existing": True},
    )

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    stock_code: str = Field(
        foreign_key="shanghai_a_stocks.code",
        max_length=12,
        index=True,
        description="股票代码",
    )
    report_period: dt.date = Field(index=True, description="季度末日期")
    announcement_date: Optional[dt.date] = Field(default=None, description="公告日期")
    currency_funds: Optional[float] = Field(default=None, description="资产-货币资金（元）")
    accounts_receivable: Optional[float] = Field(default=None, description="资产-应收账款（元）")
    inventory: Optional[float] = Field(default=None, description="资产-存货（元）")
    total_assets: Optional[float] = Field(default=None, description="资产-总资产（元）")
    total_assets_yoy: Optional[float] = Field(default=None, description="资产-总资产同比（%）")
    accounts_payable: Optional[float] = Field(default=None, description="负债-应付账款（元）")
    advance_receipts: Optional[float] = Field(default=None, description="负债-预收账款（元）")
    total_liabilities: Optional[float] = Field(default=None, description="负债-总负债（元）")
    total_liabilities_yoy: Optional[float] = Field(default=None, description="负债-总负债同比（%）")
    debt_to_asset_ratio: Optional[float] = Field(default=None, description="资产负债率（%）")
    total_equity: Optional[float] = Field(default=None, description="股东权益合计（元）")


class ShanghaiAStockPerformance(TimestampMixin, table=True):
    """Quarterly performance snapshot for Shanghai A stocks."""

    __tablename__ = "shanghai_a_stock_performance"
    __table_args__ = (
        UniqueConstraint("stock_code", "report_period", name="uq_shanghai_a_performance"),
        {"extend_existing": True},
    )

    id: Optional[int] = Field(default=None, primary_key=True, sa_column_kwargs={"autoincrement": True})
    stock_code: str = Field(
        foreign_key="shanghai_a_stocks.code",
        max_length=12,
        index=True,
        description="股票代码",
    )
    report_period: dt.date = Field(index=True, description="季度末日期")
    announcement_date: Optional[dt.date] = Field(default=None, description="公告日期")
    eps: Optional[float] = Field(default=None, description="每股收益（元）")
    revenue: Optional[float] = Field(default=None, description="营业总收入（元）")
    revenue_yoy: Optional[float] = Field(default=None, description="营业总收入-同比增长（%）")
    revenue_qoq: Optional[float] = Field(default=None, description="营业总收入-季度环比增长（%）")
    net_profit: Optional[float] = Field(default=None, description="净利润（元）")
    net_profit_yoy: Optional[float] = Field(default=None, description="净利润-同比增长（%）")
    net_profit_qoq: Optional[float] = Field(default=None, description="净利润-季度环比增长（%）")
    bps: Optional[float] = Field(default=None, description="每股净资产（元）")
    roe: Optional[float] = Field(default=None, description="净资产收益率（%）")
    operating_cash_flow_ps: Optional[float] = Field(default=None, description="每股经营现金流量（元）")
    gross_margin: Optional[float] = Field(default=None, description="销售毛利率（%）")
    industry: Optional[str] = Field(default=None, max_length=100, description="所属行业")

