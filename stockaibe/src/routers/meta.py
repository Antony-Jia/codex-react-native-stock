from datetime import date, timedelta

from fastapi import APIRouter

from ..schemas.market import MetaConfig, TradingCalendarDay

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/trading-calendar", response_model=list[TradingCalendarDay])
async def trading_calendar(days: int = 5) -> list[TradingCalendarDay]:
    today = date.today()
    return [
        TradingCalendarDay(
            date=today + timedelta(days=i),
            is_trading_day=(today + timedelta(days=i)).weekday() < 5,
            note="节假日" if (today + timedelta(days=i)).weekday() >= 5 else None,
        )
        for i in range(days)
    ]


@router.get("/config", response_model=MetaConfig)
async def meta_config() -> MetaConfig:
    return MetaConfig(
        theme="china-red",
        slogan="洞见未来，智驭市场",
        tips=["股市有风险，投资需谨慎", "留意财报与政策窗口期"],
        extras={"support": "support@stockai.cn"},
    )
