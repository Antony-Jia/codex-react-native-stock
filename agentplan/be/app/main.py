from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import api_router
from .runtime.config import get_settings


def create_app() -> FastAPI:
    """
    Application factory so the service can be embedded or executed standalone.
    """
    app = FastAPI(title="Agent Orchestrator", version="0.1.0")
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
