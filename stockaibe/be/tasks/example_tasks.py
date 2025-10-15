"""示例任务定义

演示如何使用 @SchedulerTask 和 @LimitTask 装饰器定义任务
"""

import datetime as dt
from sqlmodel import Session, select

from src.stockaibe_be.services.task_decorators import SchedulerTask, LimitTask
from src.stockaibe_be.models import Quota, Metric
from src.stockaibe_be.core.logging_config import get_logger

logger = get_logger(__name__)


# ==================== 调度任务示例 ====================

@SchedulerTask(
    id="daily_report_001",
    name="每日数据报告",
    cron="0 9 * * *",  # 每天早上 9 点执行
    description="生成每日数据统计报告"
)
def daily_report(session: Session) -> None:
    """生成每日报告"""
    logger.info("开始生成每日报告...")
    
    # 统计昨天的数据
    yesterday = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
    yesterday_start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_end = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    statement = select(Metric).where(
        Metric.ts >= yesterday_start,
        Metric.ts <= yesterday_end
    )
    metrics = session.exec(statement).all()
    
    total_ok = sum(m.ok for m in metrics)
    total_err = sum(m.err for m in metrics)
    total_429 = sum(m.r429 for m in metrics)
    
    logger.info(
        f"📊 昨日统计: 成功 {total_ok} 次, "
        f"错误 {total_err} 次, 限流 {total_429} 次"
    )


@SchedulerTask(
    id="weekly_cleanup_001",
    name="每周数据清理",
    cron="0 2 * * 0",  # 每周日凌晨 2 点执行
    description="清理超过 30 天的旧数据"
)
def weekly_cleanup(session: Session) -> None:
    """每周清理旧数据"""
    logger.info("开始每周数据清理...")
    
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)
    statement = select(Metric).where(Metric.ts < cutoff)
    old_metrics = session.exec(statement).all()
    
    for metric in old_metrics:
        session.delete(metric)
    
    session.commit()
    logger.info(f"🗑️ 已清理 {len(old_metrics)} 条旧数据")


@SchedulerTask(
    id="hourly_health_check_001",
    name="每小时健康检查",
    cron="0 * * * *",  # 每小时执行
    description="检查系统健康状况"
)
def hourly_health_check(session: Session) -> None:
    """每小时健康检查"""
    logger.info("执行健康检查...")
    
    # 检查所有配额状态
    statement = select(Quota)
    quotas = session.exec(statement).all()
    
    active_count = sum(1 for q in quotas if q.enabled)
    inactive_count = len(quotas) - active_count
    
    logger.info(
        f"💚 配额状态: 活跃 {active_count} 个, "
        f"停用 {inactive_count} 个"
    )


# ==================== 限流任务示例 ====================

@LimitTask(
    id="external_api_call_001",
    name="调用外部API",
    quota_name="external_api",
    description="调用外部 API 服务，受限流保护"
)
def call_external_api(session: Session) -> None:
    """
    调用外部 API
    
    注意：需要先在配额管理中创建名为 'external_api' 的配额
    例如：capacity=100, refill_rate=1.0 (每秒补充1个令牌)
    """
    logger.info("调用外部 API...")
    
    # 模拟 API 调用
    import time
    time.sleep(0.1)
    
    logger.info("✓ API 调用成功")


@LimitTask(
    id="data_sync_001",
    name="数据同步任务",
    quota_name="data_sync",
    description="同步数据到远程服务器，受限流保护"
)
def sync_data(session: Session) -> None:
    """
    数据同步任务
    
    注意：需要先创建 'data_sync' 配额
    例如：capacity=50, refill_rate=0.5 (每2秒补充1个令牌)
    """
    logger.info("开始数据同步...")
    
    # 模拟数据同步逻辑
    statement = select(Quota).limit(5)
    quotas = session.exec(statement).all()
    
    logger.info(f"✓ 已同步 {len(quotas)} 条配额数据")


@LimitTask(
    id="email_notification_001",
    name="发送邮件通知",
    quota_name="email_service",
    description="发送邮件通知，防止邮件服务过载"
)
def send_email_notification(session: Session) -> None:
    """
    发送邮件通知
    
    注意：需要先创建 'email_service' 配额
    例如：capacity=20, refill_rate=0.1 (每10秒补充1个令牌)
    """
    logger.info("发送邮件通知...")
    
    # 模拟邮件发送
    logger.info("✓ 邮件发送成功")


# ==================== 混合示例 ====================

@SchedulerTask(
    id="morning_summary_001",
    name="早间摘要",
    cron="0 8 * * 1-5",  # 工作日早上 8 点
    description="工作日早间数据摘要"
)
def morning_summary(session: Session) -> None:
    """工作日早间摘要"""
    logger.info("📧 生成早间摘要...")
    
    # 获取最近 24 小时的数据
    now = dt.datetime.now(dt.timezone.utc)
    yesterday = now - dt.timedelta(hours=24)
    
    statement = select(Metric).where(Metric.ts >= yesterday)
    recent_metrics = session.exec(statement).all()
    
    if recent_metrics:
        avg_latency = sum(
            m.latency_p95 for m in recent_metrics if m.latency_p95
        ) / len([m for m in recent_metrics if m.latency_p95])
        
        logger.info(f"📊 过去24小时平均延迟: {avg_latency:.2f}ms")
    else:
        logger.info("📊 过去24小时无数据")
