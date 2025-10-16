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
from ..models import SchedulerTask, Metric, Quota, TraceLog
from .limiter import limiter_service
from .task_decorators import get_task_by_id
from .task_registry import initialize_task_system, get_active_tasks

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


def _execute_limiter_task(job_id: str, session: Session) -> None:
    """执行限流任务，应用配额限制"""
    import time
    
    task_info = get_task_by_id(job_id)
    if not task_info:
        logger.error(f"任务 {job_id} 未找到")
        return
    
    metadata = task_info["metadata"]
    func = task_info["func"]
    
    # 获取关联的配额（通过 name 字段匹配）
    quota = None
    if metadata.quota_name:
        statement = select(Quota).where(Quota.name == metadata.quota_name)
        quota = session.exec(statement).first()
        if not quota:
            logger.warning(
                f"任务 {job_id} 关联的配额名称 '{metadata.quota_name}' 不存在，"
                f"将按无限制执行"
            )
    
    start_time = time.time()
    success = False
    error_msg = None
    
    try:
        if quota and quota.enabled:
            # 尝试获取令牌
            allowed, remain = limiter_service.acquire(
                db=session,
                quota=quota,
                cost=1,
                success=False,  # 先标记为 False，执行成功后更新
                message=f"执行任务: {metadata.name}",
            )
            
            if not allowed:
                logger.warning(f"⚠️ 任务 {job_id} 被限流，剩余令牌: {remain}")
                return
            
            # 执行任务
            func(session)
            success = True
            
            # 更新为成功状态
            latency_ms = (time.time() - start_time) * 1000
            trace = TraceLog(
                quota_id=quota.id,
                status_code=200,
                latency_ms=latency_ms,
                message=f"任务执行成功: {metadata.name}",
            )
            session.add(trace)
        else:
            # 无配额限制或配额未启用，直接执行
            func(session)
            success = True
            logger.info(f"✓ 任务 {job_id} 执行成功（无限流）")
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"✗ 任务 {job_id} 执行失败: {e}", exc_info=True)
        
        # 记录错误
        if quota:
            latency_ms = (time.time() - start_time) * 1000
            trace = TraceLog(
                quota_id=quota.id,
                status_code=500,
                latency_ms=latency_ms,
                message=f"任务执行失败: {error_msg}",
            )
            session.add(trace)
    
    finally:
        # 更新任务最后执行时间
        statement = select(SchedulerTask).where(SchedulerTask.job_id == job_id)
        db_task = session.exec(statement).first()
        if db_task:
            db_task.last_run_at = dt.datetime.now(dt.timezone.utc)
        session.commit()


def _execute_scheduler_task(job_id: str, session: Session) -> None:
    """执行普通调度任务"""
    task_info = get_task_by_id(job_id)
    if not task_info:
        logger.error(f"任务 {job_id} 未找到")
        return
    
    metadata = task_info["metadata"]
    func = task_info["func"]
    
    try:
        func(session)
        logger.info(f"✓ 任务 {job_id} ({metadata.name}) 执行成功")
    except Exception as e:
        logger.error(f"✗ 任务 {job_id} 执行失败: {e}", exc_info=True)
    finally:
        # 更新任务最后执行时间
        statement = select(SchedulerTask).where(SchedulerTask.job_id == job_id)
        db_task = session.exec(statement).first()
        if db_task:
            db_task.last_run_at = dt.datetime.now(dt.timezone.utc)
        session.commit()


def load_decorator_tasks() -> None:
    """加载装饰器定义的任务到调度器"""
    with Session(engine) as session:
        active_tasks = get_active_tasks(session)
        
        for task in active_tasks:
            # 检查任务是否已在调度器中
            if scheduler.get_job(task.job_id):
                continue
            
            # 根据任务类型选择执行器
            if task.task_type == "limiter":
                executor = lambda job_id=task.job_id: _with_session(
                    lambda s: _execute_limiter_task(job_id, s)
                )
            else:
                executor = lambda job_id=task.job_id: _with_session(
                    lambda s: _execute_scheduler_task(job_id, s)
                )
            
            # 添加到调度器
            if task.cron:
                try:
                    trigger = CronTrigger.from_crontab(task.cron)
                    scheduler.add_job(
                        executor,
                        trigger=trigger,
                        id=task.job_id,
                        name=task.name,
                        replace_existing=True,
                    )
                    logger.info(f"✓ 已加载任务: {task.job_id} ({task.name})")
                except Exception as e:
                    logger.error(f"✗ 加载任务失败 {task.job_id}: {e}")


def init_jobs(tasks_dir: str = None) -> None:
    """初始化所有定时任务
    
    Args:
        tasks_dir: 任务模块目录，如果提供则扫描并加载装饰器任务
    """
    logger.info("初始化定时任务...")
    if not scheduler.running:
        scheduler.start()
        logger.info("调度器已启动")
    
    # 如果提供了任务目录，初始化装饰器任务系统
    if tasks_dir:
        with Session(engine) as session:
            initialize_task_system(session, tasks_dir)
        load_decorator_tasks()
    
    # 内置系统任务
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
