"""APScheduler task management and periodic jobs."""

from __future__ import annotations

import datetime as dt
from typing import Any, Callable

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session, select, func

from ..core.config import settings
from ..core.database import engine
from ..core.redis_client import get_redis
from ..core.logging_config import get_logger
from ..models import SchedulerTask, Metric, Quota
from .limiter import limiter_service

# 获取日志记录器
logger = get_logger(__name__)


scheduler = AsyncIOScheduler(timezone=settings.scheduler_timezone)


def _with_session(func: Callable[[Session], Any]) -> None:
    with Session(engine) as session:
        func(session)


def snapshot_metrics(session: Session) -> None:
    """Aggregate Redis stats and save to database."""
    now = dt.datetime.now(dt.timezone.utc)
    
    try:
        r = get_redis()
        statement = select(Quota)
        quotas = session.exec(statement).all()
        
        for quota in quotas:
            # Get stats from Redis for the current minute
            minute_key = now.strftime("%Y%m%d%H%M")
            stats_key = f"stats:{quota.id}:{minute_key}"
            
            try:
                stats = r.hgetall(stats_key)
                if stats:
                    ok = int(stats.get(b"ok", 0))
                    err = int(stats.get(b"err", 0))
                    r429 = int(stats.get(b"r429", 0))
                    latency_sum = float(stats.get(b"latency_sum", 0))
                    latency_count = int(stats.get(b"latency_count", 0))
                    
                    # Calculate P95 latency (simplified as average for now)
                    latency_p95 = latency_sum / latency_count if latency_count > 0 else None
                    
                    # Get current token count
                    tokens_remain = limiter_service.get_current_tokens(quota.id)
                    
                    # Save to database
                    metric = Metric(
                        ts=now,
                        quota_id=quota.id,
                        ok=ok,
                        err=err,
                        r429=r429,
                        latency_p95=latency_p95,
                        tokens_remain=tokens_remain,
                    )
                    session.add(metric)
            except Exception as e:
                logger.error(f"快照指标失败 {quota.id}: {e}", exc_info=True)
        
        session.commit()
        logger.info(f"指标快照完成，处理了 {len(quotas)} 个配额")
    except Exception as e:
        logger.error(f"快照指标任务失败: {e}", exc_info=True)
        session.rollback()


def health_check_job(session: Session) -> None:
    """Analyze error rates and 429 rates, trigger alerts or circuit breakers."""
    now = dt.datetime.now(dt.timezone.utc)
    window_start = now - dt.timedelta(minutes=settings.alert_window_minutes)
    
    try:
        statement = select(Quota).where(Quota.enabled == True)
        quotas = session.exec(statement).all()
        
        for quota in quotas:
            # Query metrics in the alert window
            statement = select(
                func.sum(Metric.ok).label("total_ok"),
                func.sum(Metric.err).label("total_err"),
                func.sum(Metric.r429).label("total_429"),
            ).where(
                Metric.quota_id == quota.id,
                Metric.ts >= window_start,
            )
            result = session.exec(statement).first()
            
            if result:
                total_ok = result[0] or 0
                total_err = result[1] or 0
                total_429 = result[2] or 0
                total_requests = total_ok + total_err + total_429
                
                if total_requests > 0:
                    error_rate = total_err / total_requests
                    rate_429 = total_429 / total_requests
                    
                    # Check thresholds
                    if error_rate > settings.alert_error_rate_threshold:
                        logger.warning(
                            f"⚠️ 告警: {quota.id} 错误率 {error_rate:.2%} "
                            f"超过阈值 {settings.alert_error_rate_threshold:.2%}"
                        )
                        # TODO: Implement circuit breaker logic
                        # quota.enabled = False
                        # session.commit()
                    
                    if rate_429 > settings.alert_429_rate_threshold:
                        logger.warning(
                            f"⚠️ 告警: {quota.id} 429 比率 {rate_429:.2%} "
                            f"超过阈值 {settings.alert_429_rate_threshold:.2%}"
                        )
                        # TODO: Implement auto-slowdown logic
                        # quota.refill_rate *= 0.8
                        # session.commit()
    except Exception as e:
        logger.error(f"健康检查任务失败: {e}", exc_info=True)


def window_reset_job(session: Session) -> None:
    """Clean up expired Redis keys and old metrics."""
    try:
        r = get_redis()
        
        # Clean up old metrics (keep last 7 days)
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
        statement = select(Metric).where(Metric.ts < cutoff)
        old_metrics = session.exec(statement).all()
        for metric in old_metrics:
            session.delete(metric)
        session.commit()
        deleted = len(old_metrics)
        
        if deleted > 0:
            logger.info(f"🗑️ 清理了 {deleted} 条旧指标")
        
        # Redis keys are auto-expired via TTL, no manual cleanup needed
    except Exception as e:
        logger.error(f"窗口重置任务失败: {e}", exc_info=True)
        session.rollback()


def init_jobs() -> None:
    """Initialize all periodic jobs."""
    logger.info("初始化定时任务...")
    if not scheduler.running:
        scheduler.start()
        logger.info("调度器已启动")
    
    # Snapshot metrics every minute
    if not scheduler.get_job("snapshot_metrics"):
        scheduler.add_job(
            lambda: _with_session(snapshot_metrics),
            trigger="interval",
            seconds=60,
            id="snapshot_metrics",
            name="Snapshot Metrics",
            replace_existing=True,
        )
    
    # Health check every 3 minutes
    if not scheduler.get_job("health_check"):
        scheduler.add_job(
            lambda: _with_session(health_check_job),
            trigger="interval",
            minutes=3,
            id="health_check",
            name="Health Check",
            replace_existing=True,
        )
    
    # Window reset daily at 3 AM
    if not scheduler.get_job("window_reset"):
        scheduler.add_job(
            lambda: _with_session(window_reset_job),
            trigger="cron",
            hour=3,
            minute=0,
            id="window_reset",
            name="Window Reset",
            replace_existing=True,
        )
    
    logger.info("所有定时任务已初始化完成")


def register_cron_job(job_id: str, cron: str, func: Callable[[], Any]) -> None:
    trigger = CronTrigger.from_crontab(cron)
    scheduler.add_job(func, trigger=trigger, id=job_id, name=job_id, replace_existing=True)


def remove_job(job_id: str) -> None:
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
