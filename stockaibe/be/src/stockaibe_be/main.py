"""
StockCrawler Limiter Admin - Main Application

A rate limiting and task scheduling management system for stock crawler.
"""

# 首先初始化日志系统
from .core.logging_config import setup_logging
setup_logging()

import logging
import os
import traceback
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session, SQLModel, select

from .api import api_router
from .core import engine, close_redis, get_logger
from .models import Quota
from .services import init_jobs, limiter_service

# 获取日志记录器
logger = get_logger(__name__)

# Create FastAPI application
app = FastAPI(
    title="StockCrawler Limiter Admin",
    description="Stock crawler rate limiting and task scheduling management system",
    version="0.1.0",
)

logger.info("StockCrawler Limiter Admin 应用初始化")

# Global exception handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all exceptions and return detailed error."""
    error_detail = {
        "error": str(exc),
        "type": type(exc).__name__,
        "traceback": traceback.format_exc()
    }
    logger.error(f"全局异常处理: {error_detail['type']} - {error_detail['error']}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=error_detail
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
    logger.info("应用启动中...")
    
    # Create database tables
    logger.info("创建数据库表...")
    SQLModel.metadata.create_all(engine)
    
    # Determine tasks directory
    # 获取项目根目录下的 tasks 目录
    project_root = Path(__file__).parent.parent.parent
    tasks_dir = project_root / "tasks"
    
    # Initialize scheduler jobs with decorator tasks
    logger.info("初始化调度任务...")
    if tasks_dir.exists():
        logger.info(f"任务目录: {tasks_dir}")
        init_jobs(tasks_dir=str(tasks_dir))
    else:
        logger.warning(f"任务目录不存在: {tasks_dir}，仅加载内置任务")
        init_jobs()
    
    # Load existing quotas into limiter service
    logger.info("加载配额配置到限流服务...")
    with Session(engine) as session:
        statement = select(Quota)
        quotas = session.exec(statement).all()
        logger.info(f"找到 {len(quotas)} 个配额配置")
        for quota in quotas:
            limiter_service.ensure_quota(quota)
            logger.debug(f"加载配额: {quota.id}")
    
    logger.info("应用启动完成")


@app.on_event("shutdown")
def shutdown_event() -> None:
    """Clean up resources on shutdown."""
    logger.info("应用关闭中...")
    close_redis()
    logger.info("应用已关闭")


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    logger.debug("健康检查请求")
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
