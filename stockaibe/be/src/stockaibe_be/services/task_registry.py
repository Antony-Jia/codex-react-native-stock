"""Task registry and synchronization with database."""

from __future__ import annotations

import datetime as dt
import importlib
import os
import sys
from pathlib import Path
from typing import List

from sqlmodel import Session, select

from ..core.logging_config import get_logger
from ..models import SchedulerTask, Quota
from .task_decorators import get_registered_tasks, get_registered_call_limiters

logger = get_logger(__name__)


def scan_task_modules(tasks_dir: str) -> None:
    """
    扫描指定目录下的所有任务模块并导入
    
    Args:
        tasks_dir: 任务模块目录的绝对路径
    """
    tasks_path = Path(tasks_dir)
    if not tasks_path.exists():
        logger.warning(f"任务目录不存在: {tasks_dir}")
        return
    
    # 将任务目录添加到 Python 路径
    if str(tasks_path.parent) not in sys.path:
        sys.path.insert(0, str(tasks_path.parent))
    
    # 扫描所有 Python 文件
    imported_count = 0
    for py_file in tasks_path.glob("*.py"):
        if py_file.name.startswith("_"):
            continue
        
        module_name = py_file.stem
        try:
            # 动态导入模块
            importlib.import_module(f"tasks.{module_name}")
            imported_count += 1
            logger.info(f"✓ 已导入任务模块: {module_name}")
        except Exception as e:
            logger.error(f"✗ 导入任务模块失败 {module_name}: {e}", exc_info=True)
    
    logger.info(f"任务模块扫描完成，共导入 {imported_count} 个模块")


def sync_tasks_to_database(session: Session) -> dict:
    """
    将装饰器注册的任务同步到数据库
    以数据库为准：
    - 数据库中不存在的任务 → 创建
    - 数据库中存在的任务 → 更新元数据（保留 is_active 状态）
    - 装饰器中不存在但数据库存在的任务 → 标记为非活跃
    
    Returns:
        统计信息字典
    """
    # 合并所有类型的任务
    registered_tasks = get_registered_tasks()
    registered_call_limiters = get_registered_call_limiters()
    
    # 将 call_limiter 也加入任务列表（仅用于记录，不会被调度器执行）
    all_tasks = {**registered_tasks, **registered_call_limiters}
    
    stats = {
        "created": 0,
        "updated": 0,
        "deactivated": 0,
        "quota_missing": [],
        "call_limiters": len(registered_call_limiters),
    }
    
    # 获取数据库中所有任务
    statement = select(SchedulerTask)
    db_tasks = {task.job_id: task for task in session.exec(statement).all()}
    
    # 获取所有配额（用于验证 quota_name）
    quota_statement = select(Quota)
    quotas = {quota.id: quota for quota in session.exec(quota_statement).all()}
    
    # 1. 同步装饰器注册的任务到数据库
    for job_id, task_info in all_tasks.items():
        metadata = task_info["metadata"]
        
        # 验证限流任务和函数调用限流器的 quota_name
        if metadata.task_type in ("limiter", "call_limiter") and metadata.quota_name:
            if metadata.quota_name not in quotas:
                logger.warning(
                    f"⚠️ 任务 {job_id} 的配额 '{metadata.quota_name}' 不存在，"
                    f"将按无限制处理"
                )
                stats["quota_missing"].append({
                    "job_id": job_id,
                    "quota_name": metadata.quota_name,
                })
        
        if job_id in db_tasks:
            # 更新现有任务（保留 is_active 和 last_run_at）
            db_task = db_tasks[job_id]
            db_task.name = metadata.name
            db_task.task_type = metadata.task_type
            db_task.cron = metadata.cron
            db_task.quota_name = metadata.quota_name
            db_task.func_path = metadata.func_path
            db_task.description = metadata.description
            db_task.updated_at = dt.datetime.now(dt.timezone.utc)
            stats["updated"] += 1
            logger.debug(f"更新任务: {job_id}")
        else:
            # 创建新任务
            new_task = SchedulerTask(
                job_id=job_id,
                name=metadata.name,
                task_type=metadata.task_type,
                cron=metadata.cron,
                quota_name=metadata.quota_name,
                func_path=metadata.func_path,
                description=metadata.description,
                is_active=True,
            )
            session.add(new_task)
            stats["created"] += 1
            logger.info(f"✓ 创建新任务: {job_id} ({metadata.name})")
    
    # 2. 标记数据库中存在但装饰器中不存在的任务为非活跃
    for job_id, db_task in db_tasks.items():
        if job_id not in all_tasks and db_task.is_active:
            db_task.is_active = False
            db_task.updated_at = dt.datetime.now(dt.timezone.utc)
            stats["deactivated"] += 1
            logger.warning(f"⚠️ 任务 {job_id} 在代码中不存在，已标记为非活跃")
    
    session.commit()
    
    logger.info(
        f"任务同步完成: 创建 {stats['created']} 个, "
        f"更新 {stats['updated']} 个, "
        f"停用 {stats['deactivated']} 个, "
        f"函数限流器 {stats['call_limiters']} 个"
    )
    
    if stats["quota_missing"]:
        logger.warning(
            f"有 {len(stats['quota_missing'])} 个任务的配额不存在，"
            f"请检查配额配置"
        )
    
    return stats


def get_active_tasks(session: Session) -> List[SchedulerTask]:
    """获取所有活跃的任务"""
    statement = select(SchedulerTask).where(SchedulerTask.is_active == True)
    return list(session.exec(statement).all())


def initialize_task_system(session: Session, tasks_dir: str) -> dict:
    """
    初始化任务系统
    1. 扫描任务模块
    2. 同步到数据库
    
    Args:
        session: 数据库会话
        tasks_dir: 任务目录路径
        
    Returns:
        同步统计信息
    """
    logger.info("=" * 60)
    logger.info("开始初始化任务系统...")
    logger.info("=" * 60)
    
    # 扫描并导入任务模块
    scan_task_modules(tasks_dir)
    
    # 同步到数据库
    stats = sync_tasks_to_database(session)
    
    logger.info("=" * 60)
    logger.info("任务系统初始化完成")
    logger.info("=" * 60)
    
    return stats
