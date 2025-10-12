from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_session
from ..models import FavoriteStock, User
from ..schemas.stocks import (
    FavoriteStockOverview,
    IndicatorSnapshot,
    InsightMessage,
    KlinePoint,
    StockNewsItem,
)
from ..services.akshare_service import (
    get_favorite_overview,
    get_indicators,
    get_insights,
    get_kline,
    get_stock_news,
)

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/favorites", response_model=list[FavoriteStockOverview])
async def favorite_stocks(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FavoriteStockOverview]:
    result = await session.execute(select(FavoriteStock.code).where(FavoriteStock.user_id == current_user.id))
    codes = [row[0] for row in result.all()] or ["600519"]
    return await get_favorite_overview(codes)


@router.get("/{code}/kline", response_model=list[KlinePoint])
async def stock_kline(code: str, period: str = "daily", limit: int = 60) -> list[KlinePoint]:
    return await get_kline(code, period=period, limit=limit)


@router.get("/{code}/indicators", response_model=IndicatorSnapshot)
async def stock_indicators(code: str) -> IndicatorSnapshot:
    return await get_indicators(code)


@router.get("/{code}/insights", response_model=list[InsightMessage])
async def stock_insights(code: str) -> list[InsightMessage]:
    return await get_insights(code)


@router.get("/{code}/news", response_model=list[StockNewsItem])
async def stock_news(code: str, limit: int = 5) -> list[StockNewsItem]:
    return await get_stock_news(code, limit=limit)
