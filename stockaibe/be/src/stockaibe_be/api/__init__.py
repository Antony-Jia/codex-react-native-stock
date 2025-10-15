"""API routes."""

from fastapi import APIRouter

from . import auth, limiter, metrics, quotas, tasks, traces

api_router = APIRouter()

# Include all sub-routers
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(quotas.router, prefix="/quotas", tags=["quotas"])
api_router.include_router(limiter.router, prefix="/limiter", tags=["limiter"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(traces.router, prefix="/traces", tags=["traces"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])

__all__ = ["api_router"]
