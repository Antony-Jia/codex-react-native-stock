from datetime import date
from typing import Any

from pydantic import BaseModel


class IndexSnapshot(BaseModel):
    name: str
    code: str
    price: float
    change_percent: float
    turnover: float | None = None


class CapitalFlow(BaseModel):
    market: str
    net_inflow: float
    balance: float | None = None


class SectorHeat(BaseModel):
    sector: str
    leader: str
    change_percent: float
    heat_score: float


class TopMover(BaseModel):
    name: str
    code: str
    change_percent: float
    latest_price: float
    driver: str | None = None


class IntradayComment(BaseModel):
    title: str
    summary: str
    timestamp: str


class TradingCalendarDay(BaseModel):
    date: date
    is_trading_day: bool
    note: str | None = None


class MetaConfig(BaseModel):
    theme: str
    slogan: str
    tips: list[str]
    extras: dict[str, Any]
