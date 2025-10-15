"""
StockCrawler Limiter Admin - Main Application

A rate limiting and task scheduling management system for stock crawler.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .api import api_router
from .core import Base, engine, close_redis
from .models import Quota
from .services import init_jobs, limiter_service

# Create FastAPI application
app = FastAPI(
    title="StockCrawler Limiter Admin",
    description="Stock crawler rate limiting and task scheduling management system",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    """Initialize database and services on startup."""
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize scheduler jobs
    init_jobs()
    
    # Load existing quotas into limiter service
    with Session(bind=engine) as session:
        quotas = session.query(Quota).all()
        for quota in quotas:
            limiter_service.ensure_quota(quota)


@app.on_event("shutdown")
def shutdown_event() -> None:
    """Clean up resources on shutdown."""
    close_redis()


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "stockaibe-limiter"}


# Include API routes
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "stockaibe_be.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
