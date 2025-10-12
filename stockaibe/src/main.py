from __future__ import annotations

import asyncio
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .auth import get_password_hash
from .config import get_settings
from .database import async_session_factory, init_db
from .models import Alert, FavoriteStock, User
from .routers import auth as auth_router
from .routers import market, meta, profile, qa, stocks

app = FastAPI(title="StockAI Backend", version="0.1.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(market.router, prefix="/api")
app.include_router(stocks.router, prefix="/api")
app.include_router(qa.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(meta.router, prefix="/api")


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.username == "demo"))
        if result.scalar_one_or_none() is None:
            user = User(
                username="demo",
                hashed_password=get_password_hash("demo123"),
                full_name="演示账号",
                risk_level="balanced",
                preferences="科技,新能源",
            )
            user.favorites.append(FavoriteStock(code="600519", alias="茅台"))
            user.favorites.append(FavoriteStock(code="000001", alias="平安银行"))
            user.alerts.append(Alert(channel="email", is_enabled=True, description="盘中异动提醒"))
            session.add(user)
            await session.commit()


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.websocket("/ws/market-stream")
async def market_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            payload = {
                "timestamp": datetime.utcnow().isoformat(),
                "index": {
                    "上证指数": {"price": 3200.0, "change": 0.12},
                    "上证50": {"price": 2800.5, "change": -0.08},
                },
            }
            await websocket.send_json(payload)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return


def run() -> None:
    import uvicorn

    uvicorn.run("stockaibe_app.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
