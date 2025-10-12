from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_session
from ..models import Alert, FavoriteStock, User
from ..schemas.market import CapitalFlow
from ..schemas.user import AlertRead, AlertUpdate, FavoriteStockRead, UserRead

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/overview", response_model=UserRead)
async def profile_overview(current_user: Annotated[User, Depends(get_current_user)]) -> UserRead:
    return UserRead.model_validate(current_user)


@router.get("/performance")
async def profile_performance() -> dict[str, float]:
    return {"return_rate": 18.6, "hit_ratio": 0.62, "max_drawdown": -0.08}


@router.get("/allocation")
async def profile_allocation() -> dict[str, list[CapitalFlow]]:
    return {
        "recommended": [
            CapitalFlow(market="权益", net_inflow=60, balance=0),
            CapitalFlow(market="固收", net_inflow=30, balance=0),
            CapitalFlow(market="商品", net_inflow=10, balance=0),
        ]
    }


@router.get("/alerts", response_model=list[AlertRead])
async def profile_alerts(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AlertRead]:
    result = await session.execute(select(Alert).where(Alert.user_id == current_user.id))
    alerts = result.scalars().all()
    return [
        AlertRead(id=alert.id, channel=alert.channel, is_enabled=alert.is_enabled, description=alert.description)
        for alert in alerts
    ]


@router.patch("/alerts/{alert_id}", response_model=AlertRead)
async def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AlertRead:
    result = await session.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    if payload.is_enabled is not None:
        alert.is_enabled = payload.is_enabled
    if payload.description is not None:
        alert.description = payload.description
    await session.commit()
    await session.refresh(alert)
    return AlertRead(id=alert.id, channel=alert.channel, is_enabled=alert.is_enabled, description=alert.description)


@router.get("/allocation/favorites", response_model=list[FavoriteStockRead])
async def allocation_favorites(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FavoriteStockRead]:
    result = await session.execute(select(FavoriteStock).where(FavoriteStock.user_id == current_user.id))
    favorites = result.scalars().all()
    return [FavoriteStockRead(code=fav.code, alias=fav.alias) for fav in favorites]
