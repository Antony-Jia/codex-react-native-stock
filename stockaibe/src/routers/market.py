from fastapi import APIRouter

from ..schemas.market import CapitalFlow, IndexSnapshot, IntradayComment, SectorHeat, TopMover
from ..services.akshare_service import (
    get_capital_flow,
    get_hot_sectors,
    get_index_snapshot,
    get_intraday_comments,
    get_top_movers,
)

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/index-snapshot", response_model=list[IndexSnapshot])
async def index_snapshot() -> list[IndexSnapshot]:
    return await get_index_snapshot()


@router.get("/capital-flow", response_model=list[CapitalFlow])
async def capital_flow() -> list[CapitalFlow]:
    return await get_capital_flow()


@router.get("/hot-sectors", response_model=list[SectorHeat])
async def hot_sectors(limit: int = 5) -> list[SectorHeat]:
    return await get_hot_sectors(limit=limit)


@router.get("/top-movers", response_model=list[TopMover])
async def top_movers(limit: int = 10) -> list[TopMover]:
    return await get_top_movers(limit=limit)


@router.get("/intraday-comments", response_model=list[IntradayComment])
async def intraday_comments() -> list[IntradayComment]:
    return await get_intraday_comments()
