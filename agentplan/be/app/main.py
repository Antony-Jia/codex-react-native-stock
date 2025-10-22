from fastapi import FastAPI

from .api.routes import api_router


def create_app() -> FastAPI:
    """
    Application factory so the service can be embedded or executed standalone.
    """
    app = FastAPI(title="Agent Orchestrator", version="0.1.0")
    app.include_router(api_router)
    return app


app = create_app()

