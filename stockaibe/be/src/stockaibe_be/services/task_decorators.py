"""Task registration decorators for scheduler and limiter tasks."""

from __future__ import annotations

import functools
import inspect
import time
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlmodel import select

from ..core.logging_config import get_logger

logger = get_logger(__name__)


# 全局任务注册表
_REGISTERED_TASKS: Dict[str, Dict[str, Any]] = {}
_REGISTERED_CALL_LIMITERS: Dict[str, Dict[str, Any]] = {}


class TaskMetadata:
    """任务元数据"""
    def __init__(
        self,
        job_id: str,
        name: str,
        task_type: str,
        func: Callable,
        cron: Optional[str] = None,
        quota_name: Optional[str] = None,
        description: Optional[str] = None,
    ):
        self.job_id = job_id
        self.name = name
        self.task_type = task_type
        self.func = func
        self.cron = cron
        self.quota_name = quota_name
        self.description = description
        self.func_path = f"{func.__module__}.{func.__qualname__}"


def SchedulerTask(
    id: str,
    name: str,
    cron: str,
    description: Optional[str] = None,
) -> Callable:
    """
    调度任务装饰器
    
    Args:
        id: 任务唯一标识
        name: 任务名称（可重复）
        cron: Cron 表达式，如 "0 3 * * *" 表示每天凌晨3点
        description: 任务描述
        
    Example:
        @SchedulerTask(id="daily_report_001", name="每日报告", cron="0 9 * * *")
        def daily_report(session: Session) -> None:
            print("生成每日报告")
    """
    def decorator(func: Callable) -> Callable:
        # 检查函数签名
        sig = inspect.signature(func)
        params = list(sig.parameters.keys())
        if not params or params[0] != "session":
            raise ValueError(
                f"任务函数 {func.__name__} 必须接受 'session: Session' 作为第一个参数"
            )
        
        # 注册任务元数据
        metadata = TaskMetadata(
            job_id=id,
            name=name,
            task_type="scheduler",
            func=func,
            cron=cron,
            description=description,
        )
        _REGISTERED_TASKS[id] = {
            "metadata": metadata,
            "func": func,
        }
        
        # 保留原函数功能
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        # 附加元数据到函数对象
        wrapper._task_metadata = metadata
        return wrapper
    
    return decorator


def LimitTask(
    id: str,
    name: str,
    quota_name: str,
    description: Optional[str] = None,
) -> Callable:
    """
    限流任务装饰器
    
    Args:
        id: 任务唯一标识
        name: 任务名称（可重复）
        quota_name: 关联的配额名称（必须在 Quota 表中存在）
        description: 任务描述
        
    Example:
        @LimitTask(id="api_call_001", name="调用外部API", quota_name="external_api")
        def call_external_api(session: Session) -> None:
            # 自动应用 external_api 配额的限流策略
            print("调用外部API")
    """
    def decorator(func: Callable) -> Callable:
        # 检查函数签名
        sig = inspect.signature(func)
        params = list(sig.parameters.keys())
        if not params or params[0] != "session":
            raise ValueError(
                f"任务函数 {func.__name__} 必须接受 'session: Session' 作为第一个参数"
            )
        
        # 注册任务元数据
        metadata = TaskMetadata(
            job_id=id,
            name=name,
            task_type="limiter",
            func=func,
            quota_name=quota_name,
            description=description,
        )
        _REGISTERED_TASKS[id] = {
            "metadata": metadata,
            "func": func,
        }
        
        # 保留原函数功能
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        # 附加元数据到函数对象
        wrapper._task_metadata = metadata
        return wrapper
    
    return decorator


def get_registered_tasks() -> Dict[str, Dict[str, Any]]:
    """获取所有已注册的任务"""
    return _REGISTERED_TASKS.copy()


def get_task_by_id(job_id: str) -> Optional[Dict[str, Any]]:
    """根据 ID 获取任务"""
    return _REGISTERED_TASKS.get(job_id)


def clear_registered_tasks() -> None:
    """清空任务注册表（主要用于测试）"""
    _REGISTERED_TASKS.clear()


def LimitCallTask(
    id: str,
    name: str,
    quota_name: str,
    description: Optional[str] = None,
) -> Callable:
    """
    函数调用限流装饰器
    
    用于保护被频繁调用的函数，每次调用时自动应用配额限流策略。
    适用于在循环中调用的函数，如批量 API 请求。
    
    Args:
        id: 任务唯一标识
        name: 任务名称（可重复）
        quota_name: 关联的配额名称（必须在 Quota 表中存在）
        description: 任务描述
        
    Example:
        @LimitCallTask(id="api_call_001", name="调用API", quota_name="external_api")
        def call_api(data: dict) -> dict:
            response = requests.post("https://api.example.com", json=data)
            return response.json()
        
        # 在调度任务中使用
        @SchedulerTask(id="batch_process_001", name="批量处理", cron="0 * * * *")
        def batch_process(session: Session) -> None:
            for item in get_items():
                result = call_api(item)  # 自动应用限流
    
    注意:
        - 如果配额不存在或未启用，函数正常执行（无限制）
        - 如果被限流，函数会阻塞等待直到获取到令牌
        - 需要在调用上下文中能访问数据库 Session
    """
    def decorator(func: Callable) -> Callable:
        # 注册到全局注册表
        metadata = TaskMetadata(
            job_id=id,
            name=name,
            task_type="call_limiter",
            func=func,
            quota_name=quota_name,
            description=description,
        )
        _REGISTERED_CALL_LIMITERS[id] = {
            "metadata": metadata,
            "func": func,
        }
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            """
            包装函数，在执行前应用限流
            
            限流策略：
            1. 尝试获取令牌
            2. 如果成功，执行函数
            3. 如果失败，等待一段时间后重试
            """
            from ..core.database import engine
            from ..models import Quota, TraceLog
            from .limiter import limiter_service
            
            # 获取配额
            with Session(engine) as session:
                statement = select(Quota).where(Quota.id == quota_name)
                quota = session.exec(statement).first()
                
                if not quota or not quota.enabled:
                    # 无配额或配额未启用，直接执行
                    logger.debug(f"函数 {func.__name__} 无限流限制")
                    return func(*args, **kwargs)
                
                # 尝试获取令牌，带重试机制
                max_retries = 10
                retry_count = 0
                start_time = time.time()
                
                while retry_count < max_retries:
                    allowed, remain = limiter_service.acquire(
                        db=session,
                        quota=quota,
                        cost=1,
                        success=False,  # 先标记为 False
                        message=f"函数调用: {name}",
                    )
                    
                    if allowed:
                        # 获取令牌成功，执行函数
                        try:
                            result = func(*args, **kwargs)
                            
                            # 记录成功
                            latency_ms = (time.time() - start_time) * 1000
                            trace = TraceLog(
                                quota_id=quota.id,
                                status_code=200,
                                latency_ms=latency_ms,
                                message=f"函数调用成功: {name}",
                            )
                            session.add(trace)
                            session.commit()
                            
                            logger.debug(
                                f"✓ 函数 {func.__name__} 执行成功 "
                                f"(耗时 {latency_ms:.2f}ms, 剩余令牌 {remain:.1f})"
                            )
                            return result
                            
                        except Exception as e:
                            # 记录错误
                            latency_ms = (time.time() - start_time) * 1000
                            trace = TraceLog(
                                quota_id=quota.id,
                                status_code=500,
                                latency_ms=latency_ms,
                                message=f"函数调用失败: {str(e)}",
                            )
                            session.add(trace)
                            session.commit()
                            
                            logger.error(f"✗ 函数 {func.__name__} 执行失败: {e}")
                            raise
                    else:
                        # 被限流，等待后重试
                        retry_count += 1
                        wait_time = min(0.1 * (2 ** retry_count), 5.0)  # 指数退避，最多 5 秒
                        
                        logger.debug(
                            f"⏳ 函数 {func.__name__} 被限流 "
                            f"(剩余令牌 {remain:.1f}, 等待 {wait_time:.2f}s, "
                            f"重试 {retry_count}/{max_retries})"
                        )
                        
                        time.sleep(wait_time)
                
                # 超过最大重试次数
                logger.warning(
                    f"⚠️ 函数 {func.__name__} 超过最大重试次数 {max_retries}，"
                    f"配额 {quota_name} 可能耗尽"
                )
                raise RuntimeError(
                    f"函数 {func.__name__} 限流超时，配额 {quota_name} 令牌不足"
                )
        
        # 附加元数据
        wrapper._task_metadata = metadata
        wrapper._is_call_limiter = True
        return wrapper
    
    return decorator


def get_registered_call_limiters() -> Dict[str, Dict[str, Any]]:
    """获取所有已注册的函数调用限流器"""
    return _REGISTERED_CALL_LIMITERS.copy()


def get_call_limiter_by_id(limiter_id: str) -> Optional[Dict[str, Any]]:
    """根据 ID 获取函数调用限流器"""
    return _REGISTERED_CALL_LIMITERS.get(limiter_id)


def clear_registered_call_limiters() -> None:
    """清空函数调用限流器注册表（主要用于测试）"""
    _REGISTERED_CALL_LIMITERS.clear()
