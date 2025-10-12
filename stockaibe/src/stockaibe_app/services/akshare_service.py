from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import akshare as ak

from ..schemas.market import CapitalFlow, IndexSnapshot, IntradayComment, SectorHeat, TopMover
from ..schemas.stocks import (
    FavoriteStockOverview,
    IndicatorSnapshot,
    InsightMessage,
    KlinePoint,
    StockNewsItem,
)


async def _run_async(func: Any, *args: Any, **kwargs: Any) -> Any:
    return await asyncio.to_thread(func, *args, **kwargs)


async def get_index_snapshot() -> list[IndexSnapshot]:
    try:
        df = await _run_async(ak.stock_zh_index_spot)
    except Exception:  # pragma: no cover - network issues
        df = None
    indices: list[IndexSnapshot] = []
    targets = {
        "000001": "上证指数",
        "000016": "上证50",
        "000688": "科创50",
    }
    if df is not None:
        df = df[df["code"].isin(targets.keys())]
        for _, row in df.iterrows():
            indices.append(
                IndexSnapshot(
                    name=targets.get(row["code"], row["name"]),
                    code=row["code"],
                    price=float(row["latest_price"]),
                    change_percent=float(row["chg_rate"]),
                    turnover=float(row.get("turnover", 0.0)),
                )
            )
    if not indices:
        for code, name in targets.items():
            indices.append(
                IndexSnapshot(name=name, code=code, price=0.0, change_percent=0.0, turnover=None)
            )
    return indices


async def get_capital_flow() -> list[CapitalFlow]:
    results: list[CapitalFlow] = []
    try:
        df = await _run_async(ak.stock_market_fund_flow)
    except Exception:  # pragma: no cover
        df = None
    if df is not None:
        for _, row in df.iterrows():
            results.append(
                CapitalFlow(
                    market=str(row.get("市场")),
                    net_inflow=float(row.get("净流入", 0)),
                    balance=float(row.get("余额", 0)),
                )
            )
    if not results:
        results = [
            CapitalFlow(market="主板", net_inflow=0.0, balance=0.0),
            CapitalFlow(market="科创板", net_inflow=0.0, balance=0.0),
        ]
    return results


async def get_hot_sectors(limit: int = 5) -> list[SectorHeat]:
    try:
        df = await _run_async(ak.stock_board_concept_name_em)
    except Exception:  # pragma: no cover
        df = None
    sectors: list[SectorHeat] = []
    if df is not None:
        df = df.head(limit)
        for _, row in df.iterrows():
            sectors.append(
                SectorHeat(
                    sector=str(row.get("板块名称")),
                    leader=str(row.get("领涨股票")),
                    change_percent=float(row.get("涨跌幅", 0.0)),
                    heat_score=float(row.get("领涨价", 0.0)),
                )
            )
    if not sectors:
        sectors = [
            SectorHeat(sector="信创", leader="龙头股", change_percent=1.2, heat_score=85.0),
            SectorHeat(sector="光伏", leader="龙头股", change_percent=-0.4, heat_score=72.0),
        ]
    return sectors


async def get_top_movers(limit: int = 10) -> list[TopMover]:
    try:
        df = await _run_async(ak.stock_rank_ljqd_ths)
    except Exception:  # pragma: no cover
        df = None
    movers: list[TopMover] = []
    if df is not None:
        df = df.head(limit)
        for _, row in df.iterrows():
            movers.append(
                TopMover(
                    name=str(row.get("名称")),
                    code=str(row.get("代码")),
                    change_percent=float(row.get("涨跌幅", 0.0)),
                    latest_price=float(row.get("最新价", 0.0)),
                    driver=str(row.get("最新提示")),
                )
            )
    if not movers:
        movers = [
            TopMover(name="示例股份", code="000000", change_percent=0.0, latest_price=0.0, driver="无")
        ]
    return movers


async def get_intraday_comments() -> list[IntradayComment]:
    now = datetime.utcnow().isoformat()
    return [
        IntradayComment(
            title="AI盘面速递",
            summary="市场震荡整理，科技与消费轮动明显。",
            timestamp=now,
        ),
        IntradayComment(
            title="风险提示",
            summary="关注宏观数据公布及汇率波动带来的影响。",
            timestamp=now,
        ),
    ]


async def get_favorite_overview(codes: list[str]) -> list[FavoriteStockOverview]:
    try:
        df = await _run_async(ak.stock_zh_a_spot_em)
    except Exception:  # pragma: no cover
        df = None
    overviews: list[FavoriteStockOverview] = []
    if df is not None:
        filtered = df[df["代码"].isin(codes)]
        for _, row in filtered.iterrows():
            overviews.append(
                FavoriteStockOverview(
                    code=str(row.get("代码")),
                    name=str(row.get("名称")),
                    latest_price=float(row.get("最新价", 0.0)),
                    change_percent=float(row.get("涨跌幅", 0.0)),
                    tags=["龙头", "高景气"],
                    ai_signal="保持观察",
                )
            )
    if not overviews:
        for code in codes:
            overviews.append(
                FavoriteStockOverview(
                    code=code,
                    name="未知",
                    latest_price=0.0,
                    change_percent=0.0,
                    tags=["示例"],
                    ai_signal="暂无数据",
                )
            )
    return overviews


async def get_kline(code: str, period: str = "daily", limit: int = 60) -> list[KlinePoint]:
    try:
        df = await _run_async(ak.stock_zh_a_hist, symbol=code, period="daily", adjust="qfq")
    except Exception:  # pragma: no cover
        df = None
    klines: list[KlinePoint] = []
    if df is not None:
        df = df.tail(limit)
        for _, row in df.iterrows():
            klines.append(
                KlinePoint(
                    timestamp=datetime.strptime(str(row.get("日期")), "%Y-%m-%d"),
                    open=float(row.get("开盘", 0.0)),
                    high=float(row.get("最高", 0.0)),
                    low=float(row.get("最低", 0.0)),
                    close=float(row.get("收盘", 0.0)),
                    volume=float(row.get("成交量", 0.0)),
                )
            )
    if not klines:
        now = datetime.utcnow()
        klines = [
            KlinePoint(
                timestamp=now,
                open=0.0,
                high=0.0,
                low=0.0,
                close=0.0,
                volume=0.0,
            )
        ]
    return klines


async def get_indicators(code: str) -> IndicatorSnapshot:
    try:
        df = await _run_async(ak.stock_zh_a_hist, symbol=code, period="daily", adjust="qfq")
    except Exception:  # pragma: no cover
        df = None
    if df is not None and not df.empty:
        closes = df["收盘"].astype(float)
        ma5 = float(closes.tail(5).mean()) if len(closes) >= 5 else None
        ma10 = float(closes.tail(10).mean()) if len(closes) >= 10 else None
        histogram = float(closes.pct_change().tail(1).fillna(0).iloc[0])
    else:
        ma5 = ma10 = histogram = None
    return IndicatorSnapshot(ma5=ma5, ma10=ma10, histogram=histogram, macd=None, signal=None, volume_ratio=None)


async def get_insights(code: str) -> list[InsightMessage]:
    return [
        InsightMessage(headline="趋势观察", detail=f"{code} 维持震荡区间，可分批建仓。"),
        InsightMessage(headline="风险控制", detail="设定止损位于前低下方，控制仓位。"),
    ]


async def get_stock_news(code: str, limit: int = 5) -> list[StockNewsItem]:
    try:
        df = await _run_async(ak.stock_news_em)
    except Exception:  # pragma: no cover
        df = None
    items: list[StockNewsItem] = []
    if df is not None:
        df = df.head(limit)
        for _, row in df.iterrows():
            items.append(
                StockNewsItem(
                    title=str(row.get("标题")),
                    source=str(row.get("来源")),
                    published_at=datetime.strptime(str(row.get("发布时间")), "%Y-%m-%d %H:%M:%S"),
                    summary=str(row.get("摘要")),
                )
            )
    if not items:
        now = datetime.utcnow()
        items = [
            StockNewsItem(
                title=f"{code} 示例资讯",
                source="示例来源",
                published_at=now,
                summary="暂无真实资讯，等待数据源接入。",
            )
        ]
    return items
