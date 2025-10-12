from datetime import datetime

from pydantic import BaseModel


class FavoriteStockOverview(BaseModel):
    code: str
    name: str
    latest_price: float
    change_percent: float
    tags: list[str]
    ai_signal: str


class KlinePoint(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class IndicatorSnapshot(BaseModel):
    ma5: float | None = None
    ma10: float | None = None
    macd: float | None = None
    signal: float | None = None
    histogram: float | None = None
    volume_ratio: float | None = None


class InsightMessage(BaseModel):
    headline: str
    detail: str


class StockNewsItem(BaseModel):
    title: str
    source: str
    published_at: datetime
    summary: str
